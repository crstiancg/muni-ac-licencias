<?php

namespace App\Http\Controllers;

use App\Enums\InspectionResult;
use App\Enums\LicenseStatus;
use App\Http\Requests\InspectionRequest;
use App\Models\Inspection;
use App\Models\InspectionPhoto;
use App\Models\ItseCertificate;
use App\Models\License;
use App\Support\YearlySequence;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Field inspection of businesses from the inspector's phone: find the
 * licence (issued here or imported), compare it on site and record the
 * visit, also for businesses without a licence.
 */
class InspectionController extends Controller
{
    /**
     * Licence finder plus the visits recorded.
     *
     * Query string: ?search= (licences) &filter[search]=&filter[result]=&filter[mine]=1&page=
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->input('search'));

        $results = $search === '' ? null : License::query()
            ->search($search)
            ->with('establishment:id')
            ->orderByRaw('case when status = ? then 0 else 1 end', ['vigente'])
            ->latest('issued_at')
            ->limit(15)
            ->get()
            ->map(fn (License $license) => $this->licenseSummary($license));

        $inspections = QueryBuilder::for(Inspection::class)
            ->with('license:id,number,trade_name,holder_name,address', 'inspector:id,name')
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::exact('result'),
                AllowedFilter::callback('mine', fn ($query, $value) => $value ? $query->where('inspector_id', Auth::id()) : null),
            )
            ->latest('visited_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString()
            ->through(fn (Inspection $inspection) => $this->inspectionRow($inspection));

        return Inertia::render('inspections/index', [
            'search' => $search,
            'results' => $results,
            'inspections' => $inspections,
            'filters' => [
                'search' => $request->input('filter.search'),
                'result' => $request->input('filter.result'),
                'mine' => (bool) $request->input('filter.mine'),
            ],
            'resultOptions' => array_map(fn (InspectionResult $result) => ['value' => $result->value, 'label' => $result->label()], InspectionResult::cases()),
            'counts' => [
                'today' => Inspection::query()->where('inspector_id', Auth::id())->whereDate('visited_at', today())->count(),
                'without_license' => Inspection::query()->where('result', InspectionResult::WithoutLicense)->count(),
            ],
        ]);
    }

    /**
     * What the QR holds (the verification URL) or a typed licence number.
     */
    public function scan(Request $request): RedirectResponse
    {
        $code = trim((string) $request->input('code'));
        $token = preg_match('~/v/([A-Za-z0-9]{6,16})(?:[/?#]|$)~', $code, $match) ? $match[1] : $code;

        $license = $token === '' ? null : License::query()
            ->where('qr_token', $token)
            ->orWhere('number', $token)
            ->first();

        if (! $license) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'El QR no corresponde a una licencia de este sistema. Búscala por RUC, nombre o dirección.']);

            return to_route('inspections.index');
        }

        return to_route('inspections.create', ['license' => $license->id]);
    }

    /**
     * The visit form: with ?license=id, what to compare on site; without
     * it, a business with no licence.
     */
    public function create(Request $request): Response
    {
        $license = $request->integer('license')
            ? License::query()->with('establishment:id')->findOrFail($request->integer('license'))
            : null;

        return Inertia::render('inspections/create', [
            'license' => $license ? [
                ...$this->licenseSummary($license),
                ...$license->only('series', 'valid_until', 'area', 'capacity'),
                'itse' => $this->itse($license),
                'inspections' => $license->inspections()->with('inspector:id,name')->limit(5)->get()
                    ->map(fn (Inspection $inspection) => $this->inspectionRow($inspection)),
            ] : null,
            'results' => InspectionResult::options($license !== null, $license?->effectiveStatus()),
            'checks' => collect(Inspection::CHECKS)->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])->values(),
            'maxPhotos' => config('licencias.inspection_max_photos'),
        ]);
    }

    /**
     * Record the visit with its photos and location.
     */
    public function store(InspectionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $license = isset($data['license_id']) ? License::find($data['license_id']) : null;
        $upper = fn (?string $value) => $value === null ? null : mb_strtoupper(trim($value));

        $inspection = DB::transaction(function () use ($data, $license, $upper, $request) {
            ['year' => $year, 'sequence' => $sequence] = YearlySequence::next(Inspection::class);

            $inspection = Inspection::create([
                'year' => $year,
                'sequence' => $sequence,
                'code' => sprintf('FIS-%d-%05d', $year, $sequence),
                'license_id' => $license?->id,
                'establishment_id' => $license?->establishment_id,
                'inspector_id' => Auth::id(),
                'visited_at' => now(),
                'result' => $data['result'],
                'license_status' => $license?->effectiveStatus()->value,
                'checks' => isset($data['checks']) ? array_map(fn ($value) => (bool) $value, $data['checks']) : null,
                'notes' => $data['notes'] ?? null,
                'business_name' => $upper($data['business_name'] ?? null),
                'holder_name' => $upper($data['holder_name'] ?? null),
                'holder_document' => $data['holder_document'] ?? null,
                'address' => $upper($data['address'] ?? null),
                'activity' => $upper($data['activity'] ?? null),
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'gps_accuracy' => $data['gps_accuracy'] ?? null,
            ]);

            foreach ($request->file('photos', []) as $photo) {
                /** @var UploadedFile $photo */
                $inspection->photos()->create([
                    'path' => $photo->store("inspections/{$year}", config('licencias.inspection_disk')),
                ]);
            }

            return $inspection;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Visita {$inspection->code} registrada: {$inspection->result->label()}."]);

        return to_route('inspections.show', $inspection);
    }

    /**
     * The visit as recorded, with its photos and map link.
     */
    public function show(Inspection $inspection): Response
    {
        $inspection->load('license.establishment:id', 'inspector:id,name', 'photos');

        return Inertia::render('inspections/show', [
            'inspection' => [
                ...$this->inspectionRow($inspection),
                ...$inspection->only('notes', 'holder_name', 'holder_document', 'activity', 'latitude', 'longitude', 'gps_accuracy'),
                'checks' => collect(Inspection::CHECKS)->map(fn (string $label, string $key) => [
                    'label' => $label,
                    'ok' => $inspection->checks[$key] ?? null,
                ])->values()->filter(fn (array $check) => $check['ok'] !== null)->values(),
                'license_status_label' => $inspection->license_status
                    ? LicenseStatus::from($inspection->license_status)->label()
                    : null,
                'license' => $inspection->license ? $this->licenseSummary($inspection->license) : null,
                'photos' => $inspection->photos->map(fn (InspectionPhoto $photo) => [
                    'id' => $photo->id,
                    'url' => route('inspections.photo', $photo),
                ]),
            ],
        ]);
    }

    /**
     * A photo from the private disk.
     */
    public function photo(InspectionPhoto $photo): StreamedResponse
    {
        return Storage::disk(config('licencias.inspection_disk'))->response($photo->path, headers: [
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function licenseSummary(License $license): array
    {
        $status = $license->effectiveStatus();

        return [
            ...$license->only('id', 'number', 'holder_name', 'holder_document', 'trade_name', 'activity', 'address', 'issued_at'),
            'series' => $license->series,
            'type_label' => $license->type->label(),
            'status' => $status->value,
            'status_label' => $status->label(),
            'is_valid' => $status === LicenseStatus::Active,
            'is_legacy' => $license->isLegacy(),
            'needs_confirmation' => $license->needsConfirmation(),
        ];
    }

    /**
     * Latest ITSE certificate of the licensed establishment.
     *
     * @return array{number: string, valid_until: string, state: string, state_label: string}|null
     */
    private function itse(License $license): ?array
    {
        $certificate = ItseCertificate::query()
            ->where('establishment_id', $license->establishment_id)
            ->latest('issued_at')
            ->first();

        return $certificate ? [
            'number' => $certificate->number,
            'valid_until' => $certificate->valid_until->toDateString(),
            'state' => $certificate->effectiveStatus(),
            'state_label' => ItseCertificate::statusLabel($certificate->effectiveStatus()),
        ] : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function inspectionRow(Inspection $inspection): array
    {
        return [
            ...$inspection->only('id', 'code', 'visited_at', 'license_id'),
            'result' => $inspection->result->value,
            'result_label' => $inspection->result->label(),
            'business_name' => $inspection->businessName(),
            'address' => $inspection->license?->address ?? $inspection->address,
            'license_number' => $inspection->license?->number,
            'inspector' => $inspection->inspector->name,
            'photos_count' => $inspection->photos_count ?? null,
        ];
    }
}
