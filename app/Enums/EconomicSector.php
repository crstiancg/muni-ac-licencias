<?php

namespace App\Enums;

enum EconomicSector: string
{
    case Commerce = 'comercio';
    case Industry = 'industria';
    case Services = 'servicio';

    public function label(): string
    {
        return match ($this) {
            self::Commerce => 'Comercio',
            self::Industry => 'Industria',
            self::Services => 'Servicio',
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
