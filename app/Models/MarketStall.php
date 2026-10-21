<?php

namespace App\Models;

use App\Concerns\Audited;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Stall (puesto) of a market and its current holder.
 *
 * @property int $id
 * @property int $market_id
 * @property string $code
 * @property string|null $stall_type
 * @property string|null $activity
 * @property string|null $fee
 * @property int|null $taxpayer_id
 * @property string|null $holder_name
 * @property string|null $holder_document
 * @property string $status activo|abandonado|inactivo
 * @property string|null $notes
 * @property int|null $legacy_id
 * @property-read Market $market
 * @property-read Taxpayer|null $taxpayer
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'market_id', 'code', 'stall_type', 'activity', 'fee', 'taxpayer_id',
    'holder_name', 'holder_document', 'status', 'notes', 'legacy_id',
])]
class MarketStall extends Model
{
    use Audited;

    public const array STATUSES = ['activo' => 'Activo', 'abandonado' => 'Abandonado', 'inactivo' => 'Inactivo'];

    public const array TYPES = ['puesto' => 'Puesto', 'stand' => 'Stand', 'tienda' => 'Tienda', 'kiosko' => 'Kiosko'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Market, $this>
     */
    public function market(): BelongsTo
    {
        return $this->belongsTo(Market::class);
    }

    /**
     * @return BelongsTo<Taxpayer, $this>
     */
    public function taxpayer(): BelongsTo
    {
        return $this->belongsTo(Taxpayer::class);
    }

    /**
     * @return HasMany<MarketCharge, $this>
     */
    public function charges(): HasMany
    {
        return $this->hasMany(MarketCharge::class)->orderByDesc('period_year')->orderByDesc('period_month');
    }

    /**
     * Unpaid charges (debt), billed or not.
     *
     * @return HasMany<MarketCharge, $this>
     */
    public function pendingCharges(): HasMany
    {
        return $this->hasMany(MarketCharge::class)->whereNull('paid_at');
    }

    /**
     * Filter by stall code, holder or activity.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('code', 'like', "{$term}%")
                ->orWhere('holder_name', 'like', "%{$term}%")
                ->orWhere('holder_document', 'like', "{$term}%")
                ->orWhere('activity', 'like', "%{$term}%")
        ));
    }
}
