<?php

namespace App\Models;

use App\Concerns\Audited;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Municipal market with stalls rented to merchants.
 *
 * @property int $id
 * @property string $name
 * @property string $payment_frequency anual|mensual
 * @property string|null $address
 * @property bool $is_active
 * @property int|null $legacy_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'payment_frequency', 'address', 'is_active', 'legacy_id'])]
class Market extends Model
{
    use Audited;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function isMonthly(): bool
    {
        return $this->payment_frequency === 'mensual';
    }

    /**
     * @return HasMany<MarketStall, $this>
     */
    public function stalls(): HasMany
    {
        return $this->hasMany(MarketStall::class);
    }
}
