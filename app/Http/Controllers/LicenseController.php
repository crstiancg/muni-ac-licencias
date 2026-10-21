<?php

namespace App\Http\Controllers;

use App\Enums\IssuedDocumentType;
use App\Enums\LicenseStatus;
use App\Models\License;
use App\Support\QrCode;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LicenseController extends Controller
{
    /**
     * Licences and sign authorizations (the old "Reporte de licencias" and
     * "Reporte de letreros"), filterable and exportable to CSV.
     *
     * Query string: ?filter[search]=&filter[type]=&filter[status]=&filter[year]=&sort=issued_at|number&page=
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $licenses = $this->query()
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        if ($licenses->isEmpty() && $licenses->currentPage() > 1) {
            return to_route('licenses.index', [
                ...$request->query(),
                'page' => max($licenses->lastPage(), 1),
            ]);
        }

        return Inertia::render('licenses/index', [
            'licenses' => $licenses->through(fn (License $license) => $this->row($license)),
            'filters' => [
                'search' => $request->input('filter.search'),
                'type' => $request->input('filter.type'),
                'status' => $request->input('filter.status'),
                'year' => $request->input('filter.year'),
                'sort' => $request->input('sort', '-issued_at'),
            ],
            'types' => IssuedDocumentType::options(),
            'statuses' => LicenseStatus::options(),
        ]);
    }

    /**
     * Same filters as the list, as a CSV for Excel.
     */
    public function export(): StreamedResponse
    {
        $query = $this->query();

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel shows accents.
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Número', 'Tipo', 'Estado', 'Emisión', 'Vencimiento', 'Titular', 'Documento', 'Nombre comercial', 'Giro', 'Dirección', 'Área m²', 'Anuncio'], ';');

            $query->lazy(500)->each(function (License $license) use ($out) {
                fputcsv($out, [
                    $license->number,
                    $license->type->label(),
                    $license->effectiveStatus()->label(),
                    $license->issued_at->format('d/m/Y'),
                    $license->valid_until?->format('d/m/Y') ?? 'Indeterminada',
                    $license->holder_name,
                    $license->holder_document,
                    $license->trade_name,
                    $license->activity,
                    $license->address,
                    $license->area,
                    $license->sign_kind ? "{$license->sign_kind}, {$license->sign_faces} cara(s), {$license->sign_width} x {$license->sign_height} m" : null,
                ], ';');
            });

            fclose($out);
        }, 'licencias-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * Up to 10 licences for pickers: ?q= searches number, holder or address;
     * without q, the in-force licences of ?taxpayer=.
     */
    public function search(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q'));

        $licenses = License::query()
            ->when(
                mb_strlen($term) >= 2,
                fn ($query) => $query->search($term),
                fn ($query) => $query->where('taxpayer_id', $request->integer('taxpayer'))
                    ->whereIn('status', [LicenseStatus::Active, LicenseStatus::TemporarilyClosed]),
            )
            ->latest('issued_at')
            ->limit(10)
            ->get();

        return response()->json($licenses->map(fn (License $license) => [
            ...$this->row($license),
            'duplicates' => $license->duplicates,
        ]));
    }

    /**
     * The licence: snapshot data, status actions and its procedure.
     */
    public function show(License $license): Response
    {
        $license->load('procedure:id,code', 'taxpayer:id,name', 'establishment:id,taxpayer_id');

        return Inertia::render('licenses/show', [
            'license' => [
                ...$this->row($license),
                ...$license->only('valid_until', 'status_reason', 'status_changed_at', 'area', 'capacity', 'risk_level', 'sign_kind', 'sign_faces', 'sign_material', 'sign_width', 'sign_height', 'taxpayer_id', 'establishment_id', 'legacy_id'),
                'procedure' => $license->procedure?->only('id', 'code'),
                'duplicates' => $license->duplicates,
                'replaced_by' => $license->replacedBy?->only('id', 'number'),
                'verification_url' => $license->verificationUrl(),
                'transitions' => array_map(fn (LicenseStatus $status) => ['value' => $status->value, 'label' => $status->label()], $license->status->transitions()),
            ],
        ]);
    }

    /**
     * Printable licence / authorization with its verification QR.
     */
    public function print(License $license): View
    {
        return view('print.license', [
            'license' => $license,
            'qr' => QrCode::svg($license->verificationUrl()),
        ]);
    }

    /**
     * Closure (temporary or definitive), reopening or revocation, with reason.
     */
    public function changeStatus(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn (LicenseStatus $status) => $status->value, $license->status->transitions()))],
            'reason' => ['required', 'string', 'min:10', 'max:500'],
        ], [
            'status.in' => 'La licencia no puede pasar a ese estado desde '.mb_strtolower($license->status->label()).'.',
        ], ['status' => 'estado', 'reason' => 'motivo']);

        $status = LicenseStatus::from($data['status']);

        DB::transaction(function () use ($license, $status, $data) {
            $license->update([
                'status' => $status,
                'status_reason' => $data['reason'],
                'status_changed_at' => now(),
            ]);

            $license->procedure?->log('licencia_'.$status->value, "{$license->number}: {$data['reason']}");
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$license->number}: {$status->label()}."]);

        return back();
    }

    /**
     * @return QueryBuilder<License>
     */
    private function query(): QueryBuilder
    {
        return QueryBuilder::for(License::class)
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::exact('type'),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('year'),
            )
            ->allowedSorts('issued_at', 'number')
            ->defaultSort('-issued_at')
            ->orderByDesc('id');
    }

    /**
     * @return array<string, mixed>
     */
    private function row(License $license): array
    {
        return [
            ...$license->only('id', 'number', 'issued_at', 'holder_name', 'holder_document', 'trade_name', 'activity', 'address'),
            'type' => $license->type->value,
            'type_label' => $license->type->label(),
            'status' => $license->effectiveStatus()->value,
            'status_label' => $license->effectiveStatus()->label(),
        ];
    }
}
