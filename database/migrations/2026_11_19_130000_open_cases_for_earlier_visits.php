<?php

use App\Enums\IssuedDocumentType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Businesses without a licence visited before follow-up cases existed
     * get one: the visits with the same RUC/DNI (also the DNI inside a RUC
     * 10) share it, the others get one each. If a licence was issued here
     * to that document after the visit, the case is born regularized.
     */
    public function up(): void
    {
        $groups = DB::table('inspections')
            ->whereNull('inspection_case_id')
            ->where('result', 'sin_licencia')
            ->orderBy('visited_at')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (object $visit) => $this->documentKey($visit->holder_document) ?? "visit-{$visit->id}");

        $sequences = DB::table('inspection_cases')->selectRaw('year, max(sequence) as sequence')->groupBy('year')->pluck('sequence', 'year');

        foreach ($groups as $visits) {
            $first = $visits->first();
            $openedAt = Carbon::parse($first->visited_at);
            $year = $openedAt->year;
            $sequence = $sequences[$year] = ($sequences[$year] ?? 0) + 1;
            $document = $visits->pluck('holder_document')->filter()->first();
            $key = $this->documentKey($document);
            $license = $key ? $this->licenseIssuedTo($key, $openedAt) : null;

            $caseId = DB::table('inspection_cases')->insertGetId([
                'year' => $year,
                'sequence' => $sequence,
                'code' => sprintf('SEG-%d-%05d', $year, $sequence),
                'status' => $license ? 'regularizado' : 'pendiente',
                'business_name' => $first->business_name ?? 'SIN NOMBRE',
                'holder_name' => $visits->pluck('holder_name')->filter()->first(),
                'holder_document' => $document,
                'document_key' => $key,
                'address' => $first->address ?? '—',
                'activity' => $visits->pluck('activity')->filter()->first(),
                'license_id' => $license?->id,
                'resolved_at' => $license?->created_at,
                'resolution_note' => $license ? 'Se emitió la '.IssuedDocumentType::OperatingLicense->label()." {$license->number}." : null,
                'opened_by' => $first->inspector_id,
                'created_at' => $first->visited_at,
                'updated_at' => $license?->created_at ?? $first->visited_at,
            ]);

            DB::table('inspections')->whereIn('id', $visits->pluck('id'))->update(['inspection_case_id' => $caseId]);
        }
    }

    /**
     * The cases stay: they may have been notified or closed since.
     */
    public function down(): void {}

    /**
     * Same as InspectionCase::documentKey(), frozen here.
     */
    private function documentKey(?string $document): ?string
    {
        $document = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', (string) $document));

        if ($document === '') {
            return null;
        }

        return preg_match('/^10(\d{8})\d$/', $document, $match) ? $match[1] : $document;
    }

    /**
     * First operating licence issued here to that person after the visit.
     */
    private function licenseIssuedTo(string $key, Carbon $since): ?object
    {
        $taxpayers = DB::table('taxpayers')
            ->where(function ($query) use ($key) {
                $query->where('document_number', $key)->orWhere('ruc', $key);

                if (preg_match('/^\d{8}$/', $key)) {
                    $query->orWhereLike('document_number', "10{$key}_")->orWhereLike('ruc', "10{$key}_");
                }
            })
            ->pluck('id');

        return $taxpayers->isEmpty() ? null : DB::table('licenses')
            ->whereIn('taxpayer_id', $taxpayers)
            ->where('type', IssuedDocumentType::OperatingLicense->value)
            ->whereNotNull('sequence')
            ->where('created_at', '>=', $since)
            ->orderBy('created_at')
            ->first(['id', 'number', 'created_at']);
    }
};
