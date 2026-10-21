<?php

namespace App\Actions\Procedures;

use App\Enums\ProcedureStatus;
use App\Models\Procedure;
use Illuminate\Support\Facades\DB;

/**
 * Registers a procedure with the next code of the year (2026-00001).
 */
class RegisterProcedure
{
    /**
     * @param  array{taxpayer_id: int, establishment_id: int, procedure_type_ids: list<int>, file_number?: ?string, folios?: ?int, notes?: ?string}  $data
     */
    public function handle(array $data): Procedure
    {
        return DB::transaction(function () use ($data) {
            $year = now()->year;

            // Lock the year's rows so two clerks never get the same sequence.
            $sequence = (int) Procedure::query()->where('year', $year)->lockForUpdate()->max('sequence') + 1;

            $procedure = Procedure::create([
                'year' => $year,
                'sequence' => $sequence,
                'code' => sprintf('%d-%05d', $year, $sequence),
                'taxpayer_id' => $data['taxpayer_id'],
                'establishment_id' => $data['establishment_id'],
                'status' => ProcedureStatus::Registered,
                'file_number' => $data['file_number'] ?? null,
                'folios' => $data['folios'] ?? null,
                'notes' => $data['notes'] ?? null,
                'registered_by' => auth()->id(),
            ]);

            $procedure->types()->attach($data['procedure_type_ids']);
            $procedure->log('registrado');

            return $procedure;
        });
    }
}
