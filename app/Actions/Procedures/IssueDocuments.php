<?php

namespace App\Actions\Procedures;

use App\Enums\IssuedDocumentType;
use App\Enums\LicenseStatus;
use App\Enums\ProcedureStatus;
use App\Models\License;
use App\Models\Procedure;
use App\Support\YearlySequence;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Issues the documents of a paid procedure: one per document type among its
 * procedure types (licence and/or sign authorization). Procedures without a
 * document (closure, duplicate...) are simply marked as attended.
 */
class IssueDocuments
{
    /**
     * @param  array{sign_kind?: ?string, sign_faces?: ?int, sign_material?: ?string, sign_width?: ?string, sign_height?: ?string}  $sign
     * @return Collection<int, License>
     */
    public function handle(Procedure $procedure, array $sign = []): Collection
    {
        if ($procedure->status !== ProcedureStatus::Paid) {
            throw ValidationException::withMessages(['documents' => 'Solo se emiten documentos de un trámite pagado.']);
        }

        $procedure->loadMissing('taxpayer', 'establishment', 'types');

        return DB::transaction(function () use ($procedure, $sign) {
            $licenses = $this->documentTypes($procedure)->map(function (IssuedDocumentType $type) use ($procedure, $sign) {
                ['year' => $year, 'sequence' => $sequence] = YearlySequence::next(
                    License::class,
                    fn ($query) => $query->where('type', $type),
                );

                $establishment = $procedure->establishment;
                $taxpayer = $procedure->taxpayer;

                return License::create([
                    'type' => $type,
                    'year' => $year,
                    'sequence' => $sequence,
                    'number' => sprintf('%s-%d-%05d', $type->prefix(), $year, $sequence),
                    'procedure_id' => $procedure->id,
                    'taxpayer_id' => $taxpayer->id,
                    'establishment_id' => $establishment->id,
                    'issued_at' => now(),
                    'status' => LicenseStatus::Active,
                    'holder_name' => $taxpayer->name,
                    'holder_document' => strtoupper($taxpayer->document_type->value).' '.$taxpayer->document_number,
                    'trade_name' => $establishment->trade_name,
                    'activity' => $establishment->activity,
                    'address' => $establishment->full_address,
                    'area' => $establishment->area,
                    'capacity' => $establishment->capacity,
                    'risk_level' => $establishment->risk_level,
                    'issued_by' => Auth::id(),
                    ...($type === IssuedDocumentType::SignAuthorization ? $sign : []),
                ]);
            });

            $procedure->update(['status' => ProcedureStatus::Issued]);
            $procedure->log(
                'emitido',
                $licenses->isEmpty()
                    ? 'Trámite atendido (no emite documento).'
                    : $licenses->map(fn (License $license) => "{$license->type->label()} {$license->number}")->join(', '),
            );

            return $licenses;
        });
    }

    /**
     * @return Collection<int, IssuedDocumentType>
     */
    public function documentTypes(Procedure $procedure): Collection
    {
        return $procedure->types
            ->pluck('document_type')
            ->filter()
            ->unique(fn (IssuedDocumentType $type) => $type->value)
            ->values();
    }
}
