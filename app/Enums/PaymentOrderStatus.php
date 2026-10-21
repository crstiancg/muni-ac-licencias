<?php

namespace App\Enums;

enum PaymentOrderStatus: string
{
    case Pending = 'pendiente';
    case Paid = 'pagada';
    case Cancelled = 'anulada';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pendiente de pago',
            self::Paid => 'Pagada',
            self::Cancelled => 'Anulada',
        };
    }
}
