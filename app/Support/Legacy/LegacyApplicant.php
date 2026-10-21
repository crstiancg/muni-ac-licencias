<?php

namespace App\Support\Legacy;

use App\Enums\DocumentType;

/**
 * Reads the applicant identity typed in a dblicencias.lic_tramite row.
 * Shared by the taxpayer and establishment imports so both resolve the same
 * person from the same procedure.
 */
final class LegacyApplicant
{
    /**
     * @return array{0: DocumentType, 1: string, 2: string|null}|null [type, number, natural person RUC]
     */
    public static function identify(object $row): ?array
    {
        $dni = self::clean($row->tra_dni_ce);
        $ruc = self::clean($row->tra_ruc);

        $ruc = $ruc !== null && preg_match(DocumentType::Ruc->pattern(), $ruc) ? $ruc : null;

        return match (true) {
            // Company, or natural person without DNI (15/17): the RUC is the identity.
            $ruc !== null && ! str_starts_with($ruc, '10') => [DocumentType::Ruc, $ruc, null],
            // RUC 10 embeds the DNI: trust it over a mistyped DNI field.
            $ruc !== null => [DocumentType::Dni, substr($ruc, 2, 8), $ruc],
            $dni !== null && preg_match(DocumentType::Dni->pattern(), $dni) === 1 => [DocumentType::Dni, $dni, null],
            $dni !== null && preg_match('/^[A-Z0-9]{9,12}$/', strtoupper($dni)) === 1 => [DocumentType::Ce, strtoupper($dni), null],
            default => null,
        };
    }

    /**
     * Legacy values carry tabs and repeated spaces; "-" and "" mean nothing.
     */
    public static function clean(?string $value): ?string
    {
        $value = trim(preg_replace('/\s+/u', ' ', (string) $value));

        return in_array($value, ['', '-', '.'], true) ? null : $value;
    }
}
