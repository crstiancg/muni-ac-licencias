<?php

namespace App\Http\Controllers;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Enums\IssuedDocumentType;
use App\Enums\PaymentOrderStatus;
use App\Enums\ProcedureStatus;
use App\Http\Requests\ProcedureRequest;
use App\Models\License;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use App\Models\Uit;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            )
            ->allowedSorts('created_at')
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
                'sort' => $request->input('sort', '-created_at'),
            ],
            'statuses' => ProcedureStatus::options(),
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
                ? Taxpayer::query()->find($request->integer('taxpayer'), ['id', 'document_type', 'document_number', 'ruc', 'name', 'address'])
                : null,
            // "Copiar datos de licencia": same owner and establishment.
            'establishmentId' => $request->integer('establishment') ?: null,
            ...$this->formOptions(),
        ]);
    }

    /**
     * Register the procedure and open its file.
     */
    public function store(ProcedureRequest $request, RegisterProcedure $register): RedirectResponse
    {
        $procedure = $register->handle($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Trámite {$procedure->code} registrado."]);

        return to_route('procedures.show', $procedure);
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
            'events.user:id,name',
            'registeredBy:id,name',
        ]);

        $currentUit = Uit::query()->firstWhere('year', now()->year);
        $documentTypes = (new IssueDocuments)->documentTypes($procedure);

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
                    ...$license->only('id', 'number', 'issued_at'),
                    'type_label' => $license->type->label(),
                    'status' => $license->status->value,
                    'status_label' => $license->status->label(),
                ]),
                'documents_to_issue' => $documentTypes->map(fn (IssuedDocumentType $type) => $type->label()),
                'needs_sign_data' => $documentTypes->contains(IssuedDocumentType::SignAuthorization),
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
        $needsSign = $issue->documentTypes($procedure->load('types'))->contains(IssuedDocumentType::SignAuthorization);

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

        $licenses = $issue->handle($procedure, $sign, $validUntil);

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
            'procedure' => $procedure->load('taxpayer', 'establishment'),
            'order' => $procedure->paymentOrder->load('items', 'issuedBy:id,name'),
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
                'taxpayer:id,document_type,document_number,ruc,name,address',
                'types:id',
            ]),
            ...$this->formOptions(),
        ]);
    }

    /**
     * Update the procedure while it is still registered.
     */
    public function update(ProcedureRequest $request, Procedure $procedure): RedirectResponse
    {
        if (! $procedure->status->isEditable()) {
            return $this->notEditable($procedure);
        }

        DB::transaction(function () use ($request, $procedure) {
            $procedure->update($request->safe()->except('procedure_type_ids'));
            $procedure->types()->sync($request->validated('procedure_type_ids'));
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
                ->get(['id', 'tupa_code', 'name', 'uit_percentage', 'risk_level'])
                ->map(fn (ProcedureType $type) => [
                    ...$type->toArray(),
                    'fee' => $currentUit ? $type->feeFor($currentUit) : null,
                ]),
            'currentUit' => $currentUit?->only('year', 'amount'),
        ];
    }
}
