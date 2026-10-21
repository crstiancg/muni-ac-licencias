<?php

namespace App\Support\Legacy;

use App\Enums\StreetType;

/**
 * Identity of an establishment typed in a dblicencias.lic_tramite row: owner
 * plus normalized address. Shared by the establishment and procedure imports
 * so both resolve the same establishment.
 */
final class LegacyEstablishment
{
    /**
     * "AV [Avenida]" => StreetType::Avenue
     */
    public static function streetType(?string $value): ?StreetType
    {
        return StreetType::tryFrom(strtok((string) $value, ' ') ?: '');
    }

    /**
     * Owner + normalized address, e.g. "12|JR|TACNA|246|".
     */
    public static function key(int $taxpayerId, ?StreetType $streetType, ?string $street, ?string $number, ?string $interior): string
    {
        $normalize = fn (?string $value) => preg_replace('/[^A-Z0-9Ñ]+/u', '', mb_strtoupper((string) $value));

        return implode('|', [
            $taxpayerId,
            $streetType?->value,
            $normalize($street),
            $normalize($number),
            $normalize($interior),
        ]);
    }

    /**
     * Key of the establishment a legacy procedure row refers to.
     */
    public static function keyFromRow(int $taxpayerId, object $row): string
    {
        return self::key(
            $taxpayerId,
            self::streetType($row->tra_tipo_via_est),
            mb_substr((string) LegacyApplicant::clean($row->tra_est_dire), 0, 150),
            mb_substr((string) LegacyApplicant::clean($row->tra_est_nro), 0, 20),
            mb_substr((string) LegacyApplicant::clean($row->tra_est_int), 0, 20),
        );
    }
}
