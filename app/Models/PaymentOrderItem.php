<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * One fee of a payment order, a snapshot of the procedure type when issued.
 *
 * @property int $id
 * @property int $payment_order_id
 * @property int $procedure_type_id
 * @property string $description
 * @property string $uit_percentage
 * @property string $amount
 */
#[Fillable(['procedure_type_id', 'description', 'uit_percentage', 'amount'])]
class PaymentOrderItem extends Model
{
    public $timestamps = false;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'uit_percentage' => 'decimal:4',
            'amount' => 'decimal:2',
        ];
    }
}
