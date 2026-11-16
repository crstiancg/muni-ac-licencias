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
     * Why this result contradicts the licence's status, or null when it fits.
     * "Licencia no vigente" only for a licence not in force; "Conforme" only
     * for one in force.
     */
    public function contradicts(?LicenseStatus $status): ?string
    {
        if ($status === null) {
            return null;
        }

        return match (true) {
            $this === self::LicenseNotInForce && $status === LicenseStatus::Active => 'Esta licencia está vigente.',
            $this === self::Compliant && $status !== LicenseStatus::Active => "La licencia no está vigente ({$status->label()}).",
            default => null,
        };
    }

    /**
     * @return list<array{value: string, label: string, description: string, disabled: string|null}>
     */
    public static function options(bool $withLicense, ?LicenseStatus $status = null): array
    {
        return array_map(fn (self $result) => [
            'value' => $result->value,
            'label' => $result->label(),
            'description' => $result->description(),
            'disabled' => $result->contradicts($status),
        ], self::for($withLicense));
    }
}
