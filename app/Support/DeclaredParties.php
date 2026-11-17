<?php

namespace App\Support;

use App\Models\Establishment;
use App\Models\Taxpayer;
use Illuminate\Support\Arr;

/**
 * The applicant and the establishment as a procedure declared them. Each
 * procedure keeps its own copy: correcting it changes that procedure's DJ,
 * payment order and licence, not the taxpayer's record or its other
 * procedures. The representative already lives in the declaration.
 */
final class DeclaredParties
{
    public const array TAXPAYER = [
        'document_type', 'document_number', 'ruc', 'name', 'email', 'phone',
        'address', 'number', 'interior', 'block', 'lot', 'settlement',
        'district', 'province', 'department',
    ];

    public const array ESTABLISHMENT = [
        'trade_name', 'activity', 'economic_sector',
        'street_type', 'street', 'number', 'interior', 'block', 'lot',
        'settlement_type', 'settlement_name', 'area', 'capacity', 'risk_level',
    ];

    /**
     * @return array<string, mixed>
     */
    public static function ofTaxpayer(Taxpayer $taxpayer): array
    {
        return self::raw($taxpayer->getAttributes(), self::TAXPAYER);
    }

    /**
     * @return array<string, mixed>
     */
    public static function ofEstablishment(Establishment $establishment): array
    {
        return self::raw($establishment->getAttributes(), self::ESTABLISHMENT);
    }

    /**
     * As stored (enum values, decimals as text), every key present.
     *
     * @param  array<string, mixed>  $attributes
     * @param  list<string>  $fields
     * @return array<string, mixed>
     */
    public static function raw(array $attributes, array $fields): array
    {
        return collect($fields)->mapWithKeys(fn (string $field) => [$field => Arr::get($attributes, $field)])->all();
    }
}
