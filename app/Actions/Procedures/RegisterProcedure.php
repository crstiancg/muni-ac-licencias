<?php

namespace App\Actions\Procedures;

use App\Enums\ProcedureStatus;
use App\Models\Procedure;
use App\Support\YearlySequence;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Registers a procedure with the next code of the year (2026-00001),
 * creating the taxpayer and establishment in the same transaction when new.
 */
class RegisterProcedure
{
    public function __construct(private ResolveParties $parties) {}

    /**
     * @param  array<string, mixed>  $data  validated ProcedureRequest data
     */
    public function handle(array $data): Procedure
    {
        return DB::transaction(function () use ($data) {
            ['year' => $year, 'sequence' => $sequence] = YearlySequence::next(Procedure::class);

            $procedure = Procedure::create([
                ...$this->parties->handle($data),
                'year' => $year,
                'sequence' => $sequence,
                'code' => sprintf('%d-%05d', $year, $sequence),
                'status' => ProcedureStatus::Registered,
                'file_number' => $data['file_number'] ?? null,
                'folios' => $data['folios'] ?? null,
                'notes' => $data['notes'] ?? null,
                'registered_by' => Auth::id(),
            ]);

            $procedure->types()->attach($data['procedure_type_ids']);
            $procedure->log('registrado');

            return $procedure;
        });
    }
}
