<?php

namespace App\Models;

use App\Enums\PaymentOrderStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Orden de pago: the fees of a procedure frozen with the UIT of the day.
 *
 * @property int $id
 * @property int $procedure_id
 * @property int $year
 * @property int $sequence
 * @property string $code
 * @property int $uit_year
 * @property string $uit_amount
 * @property string $total
 * @property PaymentOrderStatus $status
 * @property int|null $issued_by
 * @property string|null $receipt_number
 * @property Carbon|null $paid_at
 * @property int|null $payment_registered_by
 * @property-read Procedure $procedure
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'procedure_id', 'year', 'sequence', 'code', 'uit_year', 'uit_amount', 'total',
    'status', 'issued_by', 'receipt_number', 'paid_at', 'payment_registered_by',
])]
class PaymentOrder extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => PaymentOrderStatus::class,
            'uit_amount' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_at' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Procedure, $this>
     */
    public function procedure(): BelongsTo
    {
        return $this->belongsTo(Procedure::class);
    }

    /**
     * @return HasMany<PaymentOrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PaymentOrderItem::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
