<?php

namespace App\Actions\Procedures;

use App\Enums\IssuedDocumentType;
use App\Enums\LicenseEffect;
use App\Enums\LicenseStatus;
use App\Enums\ProcedureStatus;
use App\Models\License;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Support\YearlySequence;
use Carbon\CarbonInterface;
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
     * @param  string|null  $validUntil  temporary licence requested by the applicant (Ley 28976 art. 11)
     * @param  License|null  $related  existing licence the procedure replaces, closes or duplicates
     * @return Collection<int, License>
     */
    public function handle(Procedure $procedure, array $sign = [], ?string $validUntil = null, ?License $related = null): Collection
    {
        if ($procedure->status !== ProcedureStatus::Paid) {
            throw ValidationException::withMessages(['documents' => 'Solo se emiten documentos de un trámite pagado.']);
        }

        $procedure->loadMissing('taxpayer', 'establishment', 'types');
        $effects = $this->licenseEffects($procedure);

        if ($effects->isNotEmpty()) {
            $this->ensureCanAffect($effects, $related);
        }

        $this->ensurePriorItse($procedure);

        return DB::transaction(function () use ($procedure, $sign, $validUntil, $related, $effects) {
            $licenses = $this->documentTypes($procedure)->map(function (IssuedDocumentType $type) use ($procedure, $sign, $validUntil) {
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
                    'valid_until' => $validUntil ?? $this->validUntil($procedure, $type),
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

            $procedure->update(['status' => ProcedureStatus::Issued, 'related_license_id' => $related?->id]);
            $procedure->log(
                'emitido',
                $licenses->isEmpty()
                    ? 'Trámite atendido (no emite documento).'
                    : $licenses->map(fn (License $license) => "{$license->type->label()} {$license->number}")->join(', '),
            );

            if ($related) {
                $effects->each(fn (LicenseEffect $effect) => $this->apply($effect, $related, $procedure, $licenses));
            }

            return $licenses;
        });
    }

    /**
     * @return Collection<int, LicenseEffect>
     */
    public function licenseEffects(Procedure $procedure): Collection
    {
        return $procedure->types
            ->pluck('license_effect')
            ->filter()
            ->unique(fn (LicenseEffect $effect) => $effect->value)
            ->values();
    }

    /**
     * High and very high risk licences need the ITSE before being granted
     * (D.S. N° 002-2018-PCM): block issuing without one in force.
     */
    private function ensurePriorItse(Procedure $procedure): void
    {
        $needsPriorItse = $procedure->types->contains(
            fn (ProcedureType $type) => $type->document_type === IssuedDocumentType::OperatingLicense
                && $type->risk_level?->requiresPriorItse(),
        );

        if ($needsPriorItse && ! $procedure->establishment->validItse()) {
            throw ValidationException::withMessages(['documents' => 'Riesgo alto o muy alto: registra primero el certificado ITSE vigente del establecimiento (ITSE previa).']);
        }
    }

    /**
     * @param  Collection<int, LicenseEffect>  $effects
     */
    private function ensureCanAffect(Collection $effects, ?License $related): void
    {
        if (! $related) {
            throw ValidationException::withMessages(['related_license_id' => 'Elige la licencia sobre la que actúa el trámite ('.$effects->map->label()->join(', ').').']);
        }

        $effects->each(function (LicenseEffect $effect) use ($related) {
            if (! in_array($related->effectiveStatus(), $effect->allowedFrom(), true)) {
                throw ValidationException::withMessages(['related_license_id' => "La licencia {$related->number} está {$related->effectiveStatus()->label()}: no admite «{$effect->label()}»."]);
            }
        });
    }

    /**
     * @param  Collection<int, License>  $issued
     */
    private function apply(LicenseEffect $effect, License $related, Procedure $procedure, Collection $issued): void
    {
        $newNumbers = $issued->pluck('number')->join(', ');

        if ($effect === LicenseEffect::Duplicate) {
            $related->increment('duplicates');
            $procedure->log('licencia_duplicado', "{$related->number}: duplicado N° {$related->duplicates}.");

            return;
        }

        [$status, $reason] = match ($effect) {
            LicenseEffect::Replace => [LicenseStatus::Replaced, "Reemplazada por {$newNumbers} (trámite {$procedure->code})."],
            LicenseEffect::Close => [LicenseStatus::Closed, "Cese de actividades (trámite {$procedure->code})."],
            LicenseEffect::TemporaryClose => [LicenseStatus::TemporarilyClosed, "Cierre temporal comunicado (trámite {$procedure->code})."],
        };

        $related->update([
            'status' => $status,
            'status_reason' => $reason,
            'status_changed_at' => now(),
            'replaced_by_id' => $effect === LicenseEffect::Replace ? $issued->first()?->id : $related->replaced_by_id,
        ]);
        $procedure->log('licencia_'.$status->value, "{$related->number}: {$reason}");
        $related->procedure?->log('licencia_'.$status->value, "{$related->number}: {$reason}");
    }

    /**
     * Indefinite unless a procedure type of that document has a validity
     * (e.g. provisional licence for bodegas, 12 months): the shortest wins.
     */
    private function validUntil(Procedure $procedure, IssuedDocumentType $type): ?CarbonInterface
    {
        $months = $procedure->types
            ->filter(fn (ProcedureType $procedureType) => $procedureType->document_type === $type && $procedureType->validity_months)
            ->min('validity_months');

        return $months ? now()->addMonths($months) : null;
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
