<?php

namespace App\Enums;

/**
 * Lifecycle of a procedure. What is issued at the end (licence, sign
 * authorization) is a separate document, not a status.
 */
enum ProcedureStatus: string
{
    case Registered = 'registrado';
    case Liquidated = 'liquidado';
    case Paid = 'pagado';
    case Issued = 'emitido';
    case Cancelled = 'anulado';

    public function label(): string
    {
        return match ($this) {
            self::Registered => 'Registrado',
            self::Liquidated => 'Con orden de pago',
            self::Paid => 'Pagado',
            self::Issued => 'Emitido',
            self::Cancelled => 'Anulado',
        };
    }

    /**
     * Data can change only before the payment order freezes the amounts.
     */
    public function isEditable(): bool
    {
        return $this === self::Registered;
    }

    public function isCancellable(): bool
    {
        return ! in_array($this, [self::Issued, self::Cancelled], true);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case) => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
