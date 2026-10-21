<?php

namespace App\Models;

use App\Concerns\Audited;
use App\Enums\PaymentOrderKind;
use App\Enums\PaymentOrderStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Orden de pago: procedure fees frozen with the UIT of the day, free
 * concepts or market stall fees. Paid in Caja.
 *
 * @property int $id
 * @property int|null $procedure_id
 * @property int|null $taxpayer_id
 * @property string|null $payer_name
 * @property string|null $payer_document
 * @property int $year
 * @property int $sequence
 * @property string $code
 * @property PaymentOrderKind $kind
 * @property int $uit_year
 * @property string $uit_amount
 * @property string $total
 * @property string|null $notes
 * @property PaymentOrderStatus $status
 * @property int|null $issued_by
 * @property string|null $receipt_number
 * @property Carbon|null $paid_at
 * @property int|null $payment_registered_by
 * @property-read Procedure|null $procedure
 * @property-read Taxpayer|null $taxpayer
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'procedure_id', 'taxpayer_id', 'payer_name', 'payer_document', 'kind',
    'year', 'sequence', 'code', 'uit_year', 'uit_amount', 'total', 'notes',
    'status', 'issued_by', 'receipt_number', 'paid_at', 'payment_registered_by',
])]
class PaymentOrder extends Model
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
            'kind' => PaymentOrderKind::class,
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
     * @return BelongsTo<Taxpayer, $this>
     */
    public function taxpayer(): BelongsTo
    {
        return $this->belongsTo(Taxpayer::class);
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

    /**
     * Filter by order code, receipt, payer name or document.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        $query->when($term, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query
                ->where('code', 'like', "%{$term}%")
                ->orWhere('receipt_number', 'like', "{$term}%")
                ->orWhere('payer_name', 'like', "%{$term}%")
                ->orWhere('payer_document', 'like', "{$term}%")
        ));
    }
}
