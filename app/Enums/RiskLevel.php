<?php

namespace App\Enums;

/**
 * Risk level of the establishment (D.S. N° 002-2018-PCM), which decides
 * whether the ITSE is carried out after or before granting the licence.
 */
enum RiskLevel: string
{
    case Low = 'bajo';
    case Medium = 'medio';
    case High = 'alto';
    case VeryHigh = 'muy_alto';

    public function label(): string
    {
        return match ($this) {
            self::Low => 'Bajo',
            self::Medium => 'Medio',
            self::High => 'Alto',
            self::VeryHigh => 'Muy alto',
        };
    }

    /**
     * High and very high risk need the ITSE before the licence is granted.
     */
    public function requiresPriorItse(): bool
    {
        return in_array($this, [self::High, self::VeryHigh], true);
    }

    /**
     * Options for selects in the frontend.
     *
     * @return list<array{value: string, label: string, prior_itse: bool}>
     */
    public static function options(): array
    {
        return array_map(fn (self $level) => [
            'value' => $level->value,
            'label' => $level->label(),
            'prior_itse' => $level->requiresPriorItse(),
        ], self::cases());
    }
}
