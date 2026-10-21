<?php

namespace App\Enums;

/**
 * Origin of a payment order: one Caja flow for all of them.
 */
enum PaymentOrderKind: string
{
    case Procedure = 'tramite';
    case Free = 'libre';
    case Market = 'mercado';

    public function label(): string
    {
        return match ($this) {
            self::Procedure => 'Trámite',
            self::Free => 'Otros conceptos',
            self::Market => 'Mercado',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $case) => ['value' => $case->value, 'label' => $case->label()], self::cases());
    }
}
