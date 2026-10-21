<?php

namespace App\Enums;

/**
 * Street types used in Puno addresses (same list as dblicencias).
 */
enum StreetType: string
{
    case Avenue = 'AV';
    case Street = 'CA';
    case Jiron = 'JR';
    case Passage = 'PJE';
    case Alameda = 'AL';
    case Road = 'CTRA';
    case Extension = 'PRLG';
    case Promenade = 'PS';
    case Boardwalk = 'ML';
    case Path = 'CAM';
    case Urbanization = 'URB';

    public function label(): string
    {
        return match ($this) {
            self::Avenue => 'Avenida',
            self::Street => 'Calle',
            self::Jiron => 'Jirón',
            self::Passage => 'Pasaje',
            self::Alameda => 'Alameda',
            self::Road => 'Carretera',
            self::Extension => 'Prolongación',
            self::Promenade => 'Paseo',
            self::Boardwalk => 'Malecón',
            self::Path => 'Camino',
            self::Urbanization => 'Urbanización',
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
