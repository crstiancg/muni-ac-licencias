<?php

namespace App\Actions\Inspections;

use App\Enums\InspectionCaseStatus;
use App\Models\InspectionCase;
use App\Models\License;
use App\Models\Taxpayer;
use Illuminate\Support\Facades\Auth;

/**
 * A business followed for working without a licence got one: its open
 * cases with that RUC/DNI (also the DNI given for a RUC 10) are closed as
 * regularized, pointing to the licence.
 */
class RegularizeCases
{
    public function handle(License $license, Taxpayer $taxpayer): int
    {
        $keys = collect([$taxpayer->document_number, $taxpayer->ruc])
            ->map(fn (?string $document) => InspectionCase::documentKey($document))
            ->filter()
            ->unique()
            ->values();

        if ($keys->isEmpty()) {
            return 0;
        }

        $cases = InspectionCase::query()->open()->whereIn('document_key', $keys)->get();

        $cases->each(fn (InspectionCase $case) => $case->update([
            'status' => InspectionCaseStatus::Regularized,
            'license_id' => $license->id,
            'resolved_at' => now(),
            'resolved_by' => Auth::id(),
            'resolution_note' => "Se emitió la {$license->type->label()} {$license->number}.",
        ]));

        return $cases->count();
    }
}
