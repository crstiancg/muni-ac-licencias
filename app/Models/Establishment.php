<?php

namespace App\Models;

use App\Enums\EconomicSector;
use App\Enums\RiskLevel;
use App\Enums\SettlementType;
use App\Enums\StreetType;
use Database\Factories\EstablishmentFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Place where a taxpayer carries out an economic activity.
 *
 * @property int $id
 * @property int $taxpayer_id
 * @property string|null $trade_name
 * @property string $activity
 * @property EconomicSector|null $economic_sector
 * @property StreetType|null $street_type
 * @property string $street
 * @property string|null $number
 * @property string|null $interior
 * @property string|null $block
 * @property string|null $lot
 * @property SettlementType|null $settlement_type
 * @property string|null $settlement_name
 * @property string|null $area
 * @property int|null $capacity
 * @property RiskLevel|null $risk_level
 * @property string|null $legacy_itse_type
 * @property int|null $legacy_procedure_id
 * @property-read string $full_address
 * @property-read Taxpayer $taxpayer
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'taxpayer_id', 'trade_name', 'activity', 'economic_sector',
    'street_type', 'street', 'number', 'interior', 'block', 'lot',
    'settlement_type', 'settlement_name', 'area', 'capacity', 'risk_level',
    'legacy_itse_type', 'legacy_procedure_id',
])]
#[Appends(['full_address'])]
class Establishment extends Model
{
    /** @use HasFactory<EstablishmentFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'economic_sector' => EconomicSector::class,
            'street_type' => StreetType::class,
            'settlement_type' => SettlementType::class,
            'risk_level' => RiskLevel::class,
            'area' => 'decimal:2',
            'capacity' => 'integer',
            'legacy_procedure_id' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Taxpayer, $this>
     */
    public function taxpayer(): BelongsTo
    {
        return $this->belongsTo(Taxpayer::class);
    }

    /**
     * "JR. TACNA N° 246 Int. 2 Mz. B Lt. 4 - BARRIO CERCADO".
     *
     * @return Attribute<string, never>
     */
    protected function fullAddress(): Attribute
    {
        return Attribute::get(function (): string {
            $address = implode(' ', array_filter([
                $this->street_type ? $this->street_type->value.'.' : null,
                $this->street,
                $this->number ? "N° {$this->number}" : null,
                $this->interior ? "Int. {$this->interior}" : null,
                $this->block ? "Mz. {$this->block}" : null,
                $this->lot ? "Lt. {$this->lot}" : null,
            ]));

            $settlement = trim(($this->settlement_type?->label() ?? '').' '.($this->settlement_name ?? ''));

            return $settlement === '' ? $address : "{$address} - ".mb_strtoupper($settlement);
        });
    }

    /**
     * Filter by trade name, activity, street or the owner's document or name.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('trade_name', 'like', "%{$term}%")
                ->orWhere('activity', 'like', "%{$term}%")
                ->orWhere('street', 'like', "%{$term}%")
                ->orWhereHas('taxpayer', fn (Builder $query) => $query->search($term))
        ));
    }
}
