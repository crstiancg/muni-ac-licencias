<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Fee owed by a stall for one period (a year, or a month in monthly markets).
 *
 * @property int $id
 * @property int $market_stall_id
 * @property int $period_year
 * @property int|null $period_month
 * @property string $amount
 * @property int|null $payment_order_id
 * @property Carbon|null $paid_at
 * @property string|null $receipt_number
 * @property int|null $legacy_id
 * @property-read MarketStall $stall
 * @property-read PaymentOrder|null $paymentOrder
 */
#[Fillable([
    'market_stall_id', 'period_year', 'period_month', 'amount',
    'payment_order_id', 'paid_at', 'receipt_number', 'legacy_id',
])]
class MarketCharge extends Model
{
    private const array MONTHS = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'period_year' => 'integer',
            'period_month' => 'integer',
            'amount' => 'decimal:2',
            'paid_at' => 'date',
        ];
    }

    /**
     * "Octubre 2026" or "2026".
     */
    public function periodLabel(): string
    {
        return $this->period_month
            ? ucfirst(self::MONTHS[$this->period_month]).' '.$this->period_year
            : (string) $this->period_year;
    }

    /**
     * @return BelongsTo<MarketStall, $this>
     */
    public function stall(): BelongsTo
    {
        return $this->belongsTo(MarketStall::class, 'market_stall_id');
    }

    /**
     * @return BelongsTo<PaymentOrder, $this>
     */
    public function paymentOrder(): BelongsTo
    {
        return $this->belongsTo(PaymentOrder::class);
    }
}
