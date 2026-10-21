<?php

namespace App\Enums;

enum DocumentType: string
{
    case Dni = 'dni';
    case Ce = 'ce';
    case Ruc = 'ruc';

    public function label(): string
    {
        return match ($this) {
            self::Dni => 'DNI',
            self::Ce => 'Carnet de extranjería',
            self::Ruc => 'RUC',
        };
    }

    /**
     * Format of the document number (the RUC check digit is validated apart).
     */
    public function pattern(): string
    {
        return match ($this) {
            self::Dni => '/^\d{8}$/',
            self::Ce => '/^[A-Z0-9]{8,12}$/',
            self::Ruc => '/^(10|15|17|20)\d{9}$/',
        };
    }

    /**
     * Options for selects in the frontend.
     *
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $type) => [
            'value' => $type->value,
            'label' => $type->label(),
        ], self::cases());
    }
}
