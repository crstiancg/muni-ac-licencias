<?php

namespace App\Http\Controllers;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Actions\Procedures\ResolveParties;
use App\Enums\DocumentType;
use App\Enums\EconomicSector;
use App\Enums\IssuedDocumentType;
use App\Enums\LicenseEffect;
use App\Enums\LicenseStatus;
use App\Enums\PaymentOrderStatus;
use App\Enums\ProcedureStatus;
use App\Enums\RiskLevel;
use App\Enums\SettlementType;
use App\Enums\StreetType;
use App\Http\Requests\ProcedureRequest;
use App\Models\License;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use App\Models\Uit;
use App\Support\QrCode;
use App\Support\SwornDeclaration;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProcedureController extends Controller
{
    /**
     * Display the procedures, most recent first, paginated on the server.
     *
     * Query string: ?filter[search]=&filter[status]=&sort=code|created_at (prefix - for desc)&page=
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $procedures = QueryBuilder::for(Procedure::class)
            ->with([
                'taxpayer:id,document_type,document_number,name',
                'establishment:id,activity,trade_name,street_type,street,number,interior,block,lot,settlement_type,settlement_name',
                'types:id,name',
            ])
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::exact('status'),
                AllowedFilter::callback('type', fn ($query, $value) => $query->whereHas(
                    'types',
                    fn ($types) => $types->whereKey((int) $value),
                )),
                AllowedFilter::callback('from', fn ($query, $value) => $query->whereDate('created_at', '>=', $value)),
                AllowedFilter::callback('to', fn ($query, $value) => $query->whereDate('created_at', '<=', $value)),
            )
            ->allowedSorts('created_at', 'code')
            ->defaultSort('-created_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        if ($procedures->isEmpty() && $procedures->currentPage() > 1) {
            return to_route('procedures.index', [
                ...$request->query(),
                'page' => max($procedures->lastPage(), 1),
            ]);
        }

        return Inertia::render('procedures/index', [
            'procedures' => $procedures,
            'filters' => [
                'search' => $request->input('filter.search'),
                'status' => $request->input('filter.status'),
                'type' => $request->input('filter.type'),
                'from' => $request->input('filter.from'),
                'to' => $request->input('filter.to'),
                'sort' => $request->input('sort', '-created_at'),
            ],
            'statuses' => ProcedureStatus::options(),
            // How many procedures wait at each step, for the status tabs.
            'status_counts' => Procedure::query()
                ->toBase()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status')
                ->map(fn ($total) => (int) $total),
            'types' => ProcedureType::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (ProcedureType $type) => ['value' => (string) $type->id, 'label' => $type->name]),
        ]);
    }

    /**
     * Show the form to register a procedure, optionally for a given
     * taxpayer (?taxpayer=id, e.g. from the taxpayer's file).
     */
    public function create(Request $request): Response
    {
        return Inertia::render('procedures/create', [
            'taxpayer' => $request->integer('taxpayer')
                ? Taxpayer::query()->find($request->integer('taxpayer'), ['id', 'document_type', 'document_number', 'ruc', 'name', 'address', 'phone', ...SwornDeclaration::REPRESENTATIVE])
                : null,
            // "Copiar datos de licencia": same owner and establishment.
            'establishmentId' => $request->integer('establishment') ?: null,
            ...$this->formOptions(),
        ]);
    }

    /**
     * Register the procedure, open its file and print its sworn declaration
     * for the applicant to sign and file at mesa de partes.
     */
    public function store(ProcedureRequest $request, RegisterProcedure $register): RedirectResponse
    {
        $procedure = $register->handle($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Trámite {$procedure->code} registrado: imprime la declaración jurada."]);
        Inertia::flash('open', route('procedures.declaration.print', $procedure));

        return to_route('procedures.show', $procedure);
    }

    /**
     * Printable sworn declaration (DJ) with the procedure code and the fee.
     */
    public function printDeclaration(Procedure $procedure): View
    {
        $procedure->load('taxpayer', 'establishment', 'types', 'paymentOrder');
        $uit = Uit::query()->firstWhere('year', $procedure->year);

        return view('print.declaration', [
            'procedure' => $procedure,
            'declaration' => $procedure->declaration ?? [],
            'fee' => $uit ? $procedure->types->sum(fn (ProcedureType $type) => (float) $type->feeFor($uit)) : null,
        ]);
    }

    /**
     * Mesa de partes receives the signed DJ: file number, folios and notes.
     */
    public function reception(Request $request, Procedure $procedure): RedirectResponse
    {
        $data = $request->validate([
            'file_number' => ['required', 'string', 'max:50'],
            'folios' => ['nullable', 'integer', 'min:1', 'max:9999'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ], attributes: ['file_number' => 'N° de expediente', 'folios' => 'folios', 'notes' => 'observaciones']);

        if ($procedure->status === ProcedureStatus::Cancelled) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "El trámite {$procedure->code} está anulado."]);

            return back();
        }

        DB::transaction(function () use ($procedure, $data) {
            $procedure->update($data);
            $procedure->log('recepcionado', "Expediente {$data['file_number']}");
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Expediente {$data['file_number']} registrado."]);

        return back();
    }

    /**
     * The procedure's file: data, requested types with fees and history.
     */
    public function show(Procedure $procedure): Response
    {
        $procedure->load([
            'taxpayer',
            'establishment',
            'types',
            'paymentOrder.items',
            'licenses',
            'relatedLicense',
            'events.user:id,name',
            'registeredBy:id,name',
        ]);

        $currentUit = Uit::query()->firstWhere('year', now()->year);
        $documentTypes = (new IssueDocuments)->documentTypes($procedure);
        $effects = (new IssueDocuments)->licenseEffects($procedure);

        return Inertia::render('procedures/show', [
            'procedure' => [
                ...$procedure->toArray(),
                'types' => $procedure->types->map(fn (ProcedureType $type) => [
                    ...$type->only('id', 'name', 'tupa_code', 'uit_percentage', 'risk_level'),
                    'fee' => $currentUit ? $type->feeFor($currentUit) : null,
                ]),
                'payment_order' => $procedure->paymentOrder ? [
                    ...$procedure->paymentOrder->toArray(),
                    'status_label' => $procedure->paymentOrder->status->label(),
                ] : null,
                'licenses' => $procedure->licenses->map(fn (License $license) => [
                    ...$license->only('id', 'number', 'series', 'issued_at', 'valid_until', 'duplicates', 'holder_name', 'trade_name', 'activity'),
                    'type' => $license->type->value,
                    'type_label' => $license->type->label(),
                    'status' => $license->status->value,
                    'status_label' => $license->status->label(),
                    'verification_url' => $license->verificationUrl(),
                    'qr' => QrCode::svg($license->verificationUrl()),
                ]),
                'documents_to_issue' => $documentTypes->map(fn (IssuedDocumentType $type) => $type->label()),
                'document_types_to_issue' => $documentTypes->map(fn (IssuedDocumentType $type) => ['value' => $type->value, 'label' => $type->label()]),
                'needs_sign_data' => $documentTypes->contains(IssuedDocumentType::SignAuthorization),
                'license_effects' => $effects->map(fn (LicenseEffect $effect) => $effect->label()),
                // The licence of the procedure's own place, acted on without picking it.
                'establishment_license' => $effects->isNotEmpty() ? License::query()
                    ->where('establishment_id', $procedure->establishment_id)
                    ->where('type', IssuedDocumentType::OperatingLicense)
                    ->whereIn('status', [LicenseStatus::Active, LicenseStatus::TemporarilyClosed])
                    ->latest('issued_at')
                    ->first(['id', 'number', 'series', 'holder_name', 'address', 'activity']) : null,
                'related_license' => $procedure->relatedLicense ? [
                    ...$procedure->relatedLicense->only('id', 'number', 'holder_name', 'address'),
                    'status_label' => $procedure->relatedLicense->effectiveStatus()->label(),
                ] : null,
                'status_label' => $procedure->status->label(),
                'is_editable' => $procedure->status->isEditable(),
                'is_cancellable' => $procedure->status->isCancellable(),
            ],
            'currentUit' => $currentUit?->only('year', 'amount'),
        ]);
    }

    /**
     * Issue the payment order, freezing the fees with the current UIT.
     */
    public function issuePaymentOrder(Procedure $procedure, IssuePaymentOrder $issue): RedirectResponse
    {
        $order = $issue->handle($procedure->load('types'));

        Inertia::flash('toast', ['type' => 'success', 'message' => $order->status === PaymentOrderStatus::Paid
            ? "Orden {$order->code} emitida: exonerado de pago."
            : "Orden de pago {$order->code} emitida por S/ {$order->total}."]);

        return back();
    }

    /**
     * Record the Caja receipt that paid the procedure's payment order.
     */
    public function registerPayment(Request $request, Procedure $procedure, RegisterPayment $register): RedirectResponse
    {
        $data = $request->validate([
            'receipt_number' => ['required', 'string', 'max:50'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
        ], attributes: ['receipt_number' => 'N° de comprobante', 'paid_at' => 'fecha de pago']);

        abort_unless($procedure->paymentOrder, 404);

        $register->handle($procedure->paymentOrder, $data['receipt_number'], $data['paid_at']);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pago del trámite {$procedure->code} registrado."]);

        return back();
    }

    /**
     * Issue the licence and/or sign authorization of a paid procedure.
     */
    public function issueDocuments(Request $request, Procedure $procedure, IssueDocuments $issue): RedirectResponse
    {
        $documentTypes = $issue->documentTypes($procedure->load('types'));
        $needsSign = $documentTypes->contains(IssuedDocumentType::SignAuthorization);

        // Every document is printed on a pre-printed form: its series is mandatory and unique per type.
        $series = $request->validate(
            $documentTypes->mapWithKeys(fn (IssuedDocumentType $type) => ["series.{$type->value}" => [
                'required', 'string', 'max:30', Rule::unique('licenses', 'series')->where('type', $type->value),
            ]])->all(),
            attributes: $documentTypes->mapWithKeys(fn (IssuedDocumentType $type) => ["series.{$type->value}" => "serie de {$type->label()}"])->all(),
        )['series'] ?? [];

        $sign = $needsSign ? $request->validate([
            'sign_kind' => ['required', 'in:simple,luminoso,iluminado'],
            'sign_faces' => ['required', 'integer', 'min:1', 'max:4'],
            'sign_material' => ['nullable', 'string', 'max:100'],
            'sign_width' => ['required', 'numeric', 'min:0.01', 'max:9999'],
            'sign_height' => ['required', 'numeric', 'min:0.01', 'max:9999'],
        ], attributes: [
            'sign_kind' => 'tipo de anuncio',
            'sign_faces' => 'caras',
            'sign_material' => 'material',
            'sign_width' => 'largo',
            'sign_height' => 'alto',
        ]) : [];

        // Temporary licence, only when the applicant asked for it (Ley 28976 art. 11).
        $validUntil = $request->validate(
            ['valid_until' => ['nullable', 'date', 'after:today']],
            attributes: ['valid_until' => 'vigencia temporal'],
        )['valid_until'] ?? null;

        $relatedId = $request->validate(
            ['related_license_id' => ['nullable', 'integer', 'exists:licenses,id']],
            attributes: ['related_license_id' => 'licencia'],
        )['related_license_id'] ?? null;

        $licenses = $issue->handle($procedure, $sign, $validUntil, $relatedId ? License::find($relatedId) : null, $series);

        Inertia::flash('toast', ['type' => 'success', 'message' => $licenses->isEmpty()
            ? "Trámite {$procedure->code} atendido."
            : 'Emitido: '.$licenses->pluck('number')->join(', ').'.']);

        return back();
    }

    /**
     * Printable payment order.
     */
    public function printPaymentOrder(Procedure $procedure): View
    {
        abort_unless($procedure->paymentOrder, 404);

        return view('print.payment-order', [
            'order' => $procedure->paymentOrder->load('items', 'issuedBy:id,name', 'procedure.establishment'),
        ]);
    }

    /**
     * Show the form to edit the procedure while it is still registered.
     */
    public function edit(Procedure $procedure): Response|RedirectResponse
    {
        if (! $procedure->status->isEditable()) {
            return $this->notEditable($procedure);
        }

        return Inertia::render('procedures/edit', [
            'procedure' => $procedure->load([
                'taxpayer:id,document_type,document_number,ruc,name,address,phone,'.implode(',', SwornDeclaration::REPRESENTATIVE),
                'establishment',
                'types:id',
            ]),
            ...$this->formOptions(),
        ]);
    }

    /**
     * Update the procedure while it is still registered.
     */
    public function update(ProcedureRequest $request, Procedure $procedure, ResolveParties $parties): RedirectResponse
    {
        if (! $procedure->status->isEditable()) {
            return $this->notEditable($procedure);
        }

        DB::transaction(function () use ($request, $procedure, $parties) {
            $data = $request->validated();

            $procedure->update([
                ...$parties->handle($data),
                'declaration' => SwornDeclaration::normalize($data['declaration']),
            ]);
            $procedure->types()->sync($data['procedure_type_ids']);
            $procedure->log('actualizado');
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Trámite {$procedure->code} actualizado."]);

        return to_route('procedures.show', $procedure);
    }

    /**
     * Cancel (anular) the procedure, keeping it with the reason.
     */
    public function cancel(Request $request, Procedure $procedure): RedirectResponse
    {
        if (! $procedure->status->isCancellable()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "El trámite {$procedure->code} ya no se puede anular."]);

            return back();
        }

        $data = $request->validate(
            ['cancellation_reason' => ['required', 'string', 'min:10', 'max:500']],
            attributes: ['cancellation_reason' => 'motivo'],
        );

        DB::transaction(function () use ($procedure, $data) {
            $procedure->update([
                'status' => ProcedureStatus::Cancelled,
                'cancelled_at' => now(),
                'cancellation_reason' => $data['cancellation_reason'],
            ]);
            $procedure->paymentOrder()
                ->where('status', PaymentOrderStatus::Pending)
                ->update(['status' => PaymentOrderStatus::Cancelled]);
            $procedure->log('anulado', $data['cancellation_reason']);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Trámite {$procedure->code} anulado."]);

        return back();
    }

    private function notEditable(Procedure $procedure): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'error', 'message' => "El trámite {$procedure->code} ya tiene orden de pago; no se puede editar."]);

        return to_route('procedures.show', $procedure);
    }

    /**
     * Active procedure types with their fee for the current UIT.
     *
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        $currentUit = Uit::query()->firstWhere('year', now()->year);

        return [
            'procedureTypes' => ProcedureType::query()
                ->where('is_active', true)
                ->orderBy('position')
                ->get(['id', 'tupa_code', 'name', 'uit_percentage', 'fixed_amount', 'risk_level'])
                ->map(fn (ProcedureType $type) => [
                    ...$type->toArray(),
                    'fee' => $currentUit ? $type->feeFor($currentUit) : null,
                ]),
            'currentUit' => $currentUit?->only('year', 'amount'),
            'documentTypes' => DocumentType::options(),
            'establishmentOptions' => [
                'economicSectors' => EconomicSector::options(),
                'streetTypes' => StreetType::options(),
                'settlementTypes' => SettlementType::options(),
                'riskLevels' => RiskLevel::options(),
            ],
        ];
    }
}
