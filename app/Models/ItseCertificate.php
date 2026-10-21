<?php

namespace App\Models;

use App\Enums\RiskLevel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * ITSE certificate of an establishment (valid for 2 years).
 *
 * @property int $id
 * @property int $establishment_id
 * @property int|null $procedure_id
 * @property string $number
 * @property RiskLevel $risk_level
 * @property string $inspection_timing previa|posterior
 * @property Carbon|null $inspected_at
 * @property Carbon $issued_at
 * @property Carbon $valid_until
 * @property string|null $inspector
 * @property string|null $notes
 * @property string $status vigente|revocado
 * @property string|null $status_reason
 * @property int|null $registered_by
 * @property-read Establishment $establishment
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'establishment_id', 'procedure_id', 'number', 'risk_level', 'inspection_timing',
    'inspected_at', 'issued_at', 'valid_until', 'inspector', 'notes',
    'status', 'status_reason', 'registered_by',
])]
class ItseCertificate extends Model
{
    public const int VALIDITY_YEARS = 2;

    /** Days before expiry when a certificate shows as "por vencer". */
    public const int EXPIRING_DAYS = 60;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'risk_level' => RiskLevel::class,
            'inspected_at' => 'date',
            'issued_at' => 'date',
            'valid_until' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Establishment, $this>
     */
    public function establishment(): BelongsTo
    {
        return $this->belongsTo(Establishment::class);
    }

    /**
     * vigente, por_vencer, vencido or revocado as of today.
     */
    public function effectiveStatus(): string
    {
        return match (true) {
            $this->status === 'revocado' => 'revocado',
            $this->valid_until->lt(today()) => 'vencido',
            $this->valid_until->lte(today()->addDays(self::EXPIRING_DAYS)) => 'por_vencer',
            default => 'vigente',
        };
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'vigente' => 'Vigente',
            'por_vencer' => 'Por vencer',
            'vencido' => 'Vencido',
            'revocado' => 'Revocado',
            default => $status,
        };
    }

    /**
     * Not revoked and not expired.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function valid(Builder $query): void
    {
        $query->where('status', 'vigente')->whereDate('valid_until', '>=', today());
    }

    /**
     * Filter: vigente, por_vencer, vencido, revocado.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function state(Builder $query, string $state): void
    {
        match ($state) {
            'vigente' => $query->valid(),
            'por_vencer' => $query->valid()->whereDate('valid_until', '<=', today()->addDays(self::EXPIRING_DAYS)),
            'vencido' => $query->where('status', 'vigente')->whereDate('valid_until', '<', today()),
            'revocado' => $query->where('status', 'revocado'),
            default => null,
        };
    }

    /**
     * Filter by certificate number, establishment or owner.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('number', 'like', "%{$term}%")
                ->orWhereHas('establishment', fn (Builder $query) => $query->search($term))
        ));
    }
}
