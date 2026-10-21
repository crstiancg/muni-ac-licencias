<?php

namespace App\Enums;

enum LicenseStatus: string
{
    case Active = 'vigente';
    case TemporarilyClosed = 'cese_temporal';
    case Closed = 'cese_definitivo';
    case Revoked = 'anulada';
    case Expired = 'caducada';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Vigente',
            self::TemporarilyClosed => 'Cese temporal',
            self::Closed => 'Cese definitivo',
            self::Revoked => 'Anulada',
            self::Expired => 'Caducada',
        };
    }

    /**
     * Statuses the licence can move to from this one.
     *
     * @return list<self>
     */
    public function transitions(): array
    {
        return match ($this) {
            self::Active => [self::TemporarilyClosed, self::Closed, self::Revoked],
            self::TemporarilyClosed => [self::Active, self::Closed, self::Revoked],
            default => [],
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
