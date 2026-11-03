<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * The applicant's sworn declaration (DJ) for a licence: what the printed
 * "Solicitud de declaración jurada" asks besides the applicant and the
 * establishment (sections 20-23 representative, 30-31, 35-36, 38 sectoral,
 * 39 ITSE and 40 sign). The representative is declared per procedure: the
 * attorney of today must not change the DJ signed years ago.
 */
class SwornDeclaration
{
    public const CONSTRUCTION_MATERIALS = ['noble' => 'Noble', 'rustico' => 'Rústico', 'mixto' => 'Mixto'];

    private const NUMBERS = ['length', 'width', 'extinguisher_pqs_kg', 'extinguisher_co2_kg', 'sign_length', 'sign_height'];

    public const REPRESENTATIVE = ['representative_name', 'representative_document', 'representative_sunarp', 'representative_phone'];

    private const FLAGS = ['flammable_materials', 'signage', 'breakers', 'first_aid_kit', 'wiring_conduits', 'sign'];

    /**
     * @return array<string, array<mixed>>
     */
    public static function rulesFor(string $prefix = 'declaration.'): array
    {
        $sign = "{$prefix}sign";

        return [
            rtrim($prefix, '.') => ['required', 'array'],
            "{$prefix}representative_name" => ['nullable', 'string', 'max:255'],
            "{$prefix}representative_document" => ['nullable', 'string', 'max:15'],
            "{$prefix}representative_sunarp" => ['nullable', 'string', 'max:30'],
            "{$prefix}representative_phone" => ['nullable', 'string', 'max:20'],
            "{$prefix}length" => ['nullable', 'numeric', 'min:0.01', 'max:99999'],
            "{$prefix}width" => ['nullable', 'numeric', 'min:0.01', 'max:99999'],
            "{$prefix}flammable_materials" => ['required', 'boolean'],
            "{$prefix}construction_material" => ['nullable', Rule::in(array_keys(self::CONSTRUCTION_MATERIALS))],
            "{$prefix}zoning" => ['nullable', 'string', 'max:255'],
            "{$prefix}extinguisher_pqs_kg" => ['nullable', 'numeric', 'min:0', 'max:999'],
            "{$prefix}extinguisher_co2_kg" => ['nullable', 'numeric', 'min:0', 'max:999'],
            "{$prefix}signage" => ['required', 'boolean'],
            "{$prefix}breakers" => ['required', 'boolean'],
            "{$prefix}first_aid_kit" => ['required', 'boolean'],
            "{$prefix}wiring_conduits" => ['required', 'boolean'],
            $sign => ['required', 'boolean'],
            "{$prefix}sign_luminous" => ['nullable', "required_if_accepted:{$sign}", 'boolean'],
            "{$prefix}sign_features" => ['nullable', 'string', 'max:150'],
            "{$prefix}sign_material" => ['nullable', 'string', 'max:100'],
            "{$prefix}sign_description" => ['nullable', 'string', 'max:500'],
            "{$prefix}sign_length" => ['nullable', "required_if_accepted:{$sign}", 'numeric', 'min:0.01', 'max:999'],
            "{$prefix}sign_height" => ['nullable', "required_if_accepted:{$sign}", 'numeric', 'min:0.01', 'max:999'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function attributesFor(string $prefix = 'declaration.'): array
    {
        return collect([
            'representative_name' => 'representante legal',
            'representative_document' => 'documento del representante',
            'representative_sunarp' => 'partida registral',
            'representative_phone' => 'teléfono del representante',
            'length' => 'largo del local',
            'width' => 'ancho del local',
            'flammable_materials' => 'materiales inflamables',
            'construction_material' => 'material de construcción',
            'zoning' => 'clasificación sectorial',
            'extinguisher_pqs_kg' => 'extintor PQS',
            'extinguisher_co2_kg' => 'extintor CO2',
            'signage' => 'señalización',
            'breakers' => 'llaves termomagnéticas',
            'first_aid_kit' => 'botiquín',
            'wiring_conduits' => 'cables entubados',
            'sign' => 'anuncio',
            'sign_luminous' => 'anuncio luminoso',
            'sign_features' => 'características del anuncio',
            'sign_material' => 'material del anuncio',
            'sign_description' => 'estructura y color del anuncio',
            'sign_length' => 'largo del anuncio',
            'sign_height' => 'alto del anuncio',
        ])->mapWithKeys(fn (string $label, string $key) => [$prefix.$key => $label])->all();
    }

    /**
     * Typed values to store: numbers as floats, flags as booleans and no
     * sign data when there is no sign.
     *
     * @param  array<string, mixed>  $data  validated declaration
     * @return array<string, mixed>
     */
    public static function normalize(array $data): array
    {
        $declaration = [];

        foreach (self::NUMBERS as $key) {
            $declaration[$key] = isset($data[$key]) && $data[$key] !== '' ? (float) $data[$key] : null;
        }

        foreach (self::FLAGS as $key) {
            $declaration[$key] = filter_var($data[$key] ?? false, FILTER_VALIDATE_BOOLEAN);
        }

        $declaration['construction_material'] = ($data['construction_material'] ?? null) ?: null;
        foreach (self::REPRESENTATIVE as $key) {
            $declaration[$key] = mb_strtoupper(trim((string) ($data[$key] ?? ''))) ?: null;
        }

        $declaration['zoning'] = trim((string) ($data['zoning'] ?? '')) ?: null;
        $declaration['sign_luminous'] = $declaration['sign'] ? filter_var($data['sign_luminous'] ?? false, FILTER_VALIDATE_BOOLEAN) : null;
        foreach (['sign_features', 'sign_material', 'sign_description'] as $key) {
            $declaration[$key] = $declaration['sign'] ? (trim((string) ($data[$key] ?? '')) ?: null) : null;
        }

        if (! $declaration['sign']) {
            $declaration['sign_length'] = $declaration['sign_height'] = null;
        }

        return $declaration;
    }
}
