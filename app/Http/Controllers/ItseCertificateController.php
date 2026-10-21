<?php

namespace App\Http\Controllers;

use App\Enums\RiskLevel;
use App\Http\Requests\ItseCertificateRequest;
use App\Models\Establishment;
use App\Models\ItseCertificate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ItseCertificateController extends Controller
{
    /**
     * ITSE certificates, soonest to expire first.
     *
     * Query string: ?filter[search]=&filter[state]=vigente|por_vencer|vencido|revocado&sort=valid_until|issued_at&page=
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $certificates = QueryBuilder::for(ItseCertificate::class)
            ->with('establishment.taxpayer:id,name,document_type,document_number')
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::scope('state'),
            )
            ->allowedSorts('valid_until', 'issued_at')
            ->defaultSort('valid_until')
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        if ($certificates->isEmpty() && $certificates->currentPage() > 1) {
            return to_route('itse.index', [...$request->query(), 'page' => max($certificates->lastPage(), 1)]);
        }

        return Inertia::render('itse/index', [
            'certificates' => $certificates->through(fn (ItseCertificate $certificate) => [
                ...$certificate->only('id', 'number', 'issued_at', 'valid_until', 'inspection_timing', 'status_reason'),
                'risk_label' => $certificate->risk_level->label(),
                'state' => $certificate->effectiveStatus(),
                'state_label' => ItseCertificate::statusLabel($certificate->effectiveStatus()),
                'establishment' => [
                    'id' => $certificate->establishment->id,
                    'activity' => $certificate->establishment->activity,
                    'address' => $certificate->establishment->full_address,
                ],
                'taxpayer' => $certificate->establishment->taxpayer->only('id', 'name'),
            ]),
            'filters' => [
                'search' => $request->input('filter.search'),
                'state' => $request->input('filter.state'),
                'sort' => $request->input('sort', 'valid_until'),
            ],
            'counts' => [
                'por_vencer' => ItseCertificate::query()->state('por_vencer')->count(),
                'vencido' => ItseCertificate::query()->state('vencido')->count(),
            ],
        ]);
    }

    /**
     * Form to register a certificate, optionally for ?establishment=id.
     */
    public function create(Request $request): Response
    {
        $establishment = $request->integer('establishment')
            ? Establishment::query()->with('taxpayer:id,document_type,document_number,ruc,name,address')->find($request->integer('establishment'))
            : null;

        return Inertia::render('itse/create', [
            'establishment' => $establishment,
            'riskLevels' => RiskLevel::options(),
            'validityYears' => ItseCertificate::VALIDITY_YEARS,
        ]);
    }

    /**
     * Register the certificate and update the establishment's risk level.
     */
    public function store(ItseCertificateRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $risk = RiskLevel::from($data['risk_level']);

        $certificate = DB::transaction(function () use ($data, $risk) {
            $certificate = ItseCertificate::create([
                ...$data,
                'inspection_timing' => $risk->requiresPriorItse() ? 'previa' : 'posterior',
                'valid_until' => $data['valid_until'] ?? Carbon::parse($data['issued_at'])->addYears(ItseCertificate::VALIDITY_YEARS)->subDay(),
                'status' => 'vigente',
                'registered_by' => Auth::id(),
            ]);

            $certificate->establishment->update(['risk_level' => $risk]);

            return $certificate;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "ITSE {$certificate->number} registrado, vigente hasta el {$certificate->valid_until->format('d/m/Y')}."]);

        return to_route('taxpayers.show', $certificate->establishment->taxpayer_id);
    }

    /**
     * Revoke a certificate (e.g. a later inspection found risks).
     */
    public function revoke(Request $request, ItseCertificate $certificate): RedirectResponse
    {
        $data = $request->validate(
            ['reason' => ['required', 'string', 'min:10', 'max:500']],
            attributes: ['reason' => 'motivo'],
        );

        $certificate->update(['status' => 'revocado', 'status_reason' => $data['reason']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "ITSE {$certificate->number} revocado."]);

        return back();
    }
}
