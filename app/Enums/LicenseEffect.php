<?php

namespace App\Enums;

/**
 * What attending a procedure does to an existing licence.
 */
enum LicenseEffect: string
{
    case Replace = 'reemplaza';
    case Close = 'cese';
    case TemporaryClose = 'cese_temporal';
    case Duplicate = 'duplicado';

    public function label(): string
    {
        return match ($this) {
            self::Replace => 'Reemplaza la licencia anterior',
            self::Close => 'Cese definitivo de la licencia',
            self::TemporaryClose => 'Cese temporal de la licencia',
            self::Duplicate => 'Duplicado de la licencia',
        };
    }

    /**
     * Statuses the affected licence may be in.
     *
     * @return list<LicenseStatus>
     */
    public function allowedFrom(): array
    {
        return match ($this) {
            self::Duplicate, self::TemporaryClose => [LicenseStatus::Active],
            self::Replace, self::Close => [LicenseStatus::Active, LicenseStatus::TemporarilyClosed],
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
