<?php

namespace App\Enums;

/**
 * Document a procedure ends in.
 */
enum IssuedDocumentType: string
{
    case OperatingLicense = 'licencia';
    case SignAuthorization = 'anuncio';

    public function label(): string
    {
        return match ($this) {
            self::OperatingLicense => 'Licencia de funcionamiento',
            self::SignAuthorization => 'Autorización de anuncio publicitario',
        };
    }

    /**
     * Prefix of the document number: LF-2026-00001, AP-2026-00001.
     */
    public function prefix(): string
    {
        return match ($this) {
            self::OperatingLicense => 'LF',
            self::SignAuthorization => 'AP',
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
