<?php

namespace App\Enums;

/**
 * Kind of urban settlement (tipo de habilitación) the establishment is in.
 */
enum SettlementType: string
{
    case Neighborhood = 'barrio';
    case Urbanization = 'urbanizacion';
    case HumanSettlement = 'asentamiento_humano';
    case Association = 'asociacion';
    case PopulatedCenter = 'centro_poblado';
    case HousingProgram = 'provivienda';

    public function label(): string
    {
        return match ($this) {
            self::Neighborhood => 'Barrio',
            self::Urbanization => 'Urbanización',
            self::HumanSettlement => 'Asentamiento humano',
            self::Association => 'Asociación',
            self::PopulatedCenter => 'Centro poblado',
            self::HousingProgram => 'Provivienda',
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
