<?php

namespace App\Enums;

/**
 * What the inspector found when visiting the business.
 */
enum InspectionResult: string
{
    case Compliant = 'conforme';
    case Observed = 'observado';
    case LicenseNotInForce = 'licencia_no_vigente';
    case WithoutLicense = 'sin_licencia';
    case Closed = 'cerrado';

    public function label(): string
    {
        return match ($this) {
            self::Compliant => 'Conforme',
            self::Observed => 'Con observaciones',
            self::LicenseNotInForce => 'Licencia no vigente',
            self::WithoutLicense => 'Sin licencia',
            self::Closed => 'Cerrado / no ubicado',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Compliant => 'Todo coincide con la licencia.',
            self::Observed => 'Tiene licencia, pero algo no coincide.',
            self::LicenseNotInForce => 'La licencia está caducada, anulada o en cese.',
            self::WithoutLicense => 'Funciona sin licencia de funcionamiento.',
            self::Closed => 'El local estaba cerrado o no se encontró.',
        };
    }

    /**
     * Results that make sense with or without a licence found.
     *
     * @return list<self>
     */
    public static function for(bool $withLicense): array
    {
        return $withLicense
            ? [self::Compliant, self::Observed, self::LicenseNotInForce, self::Closed]
            : [self::WithoutLicense, self::Closed];
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function options(bool $withLicense): array
    {
        return array_map(fn (self $result) => [
            'value' => $result->value,
            'label' => $result->label(),
            'description' => $result->description(),
        ], self::for($withLicense));
    }
}
