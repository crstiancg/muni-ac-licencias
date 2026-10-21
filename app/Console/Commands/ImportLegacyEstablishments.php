<?php

namespace App\Console\Commands;

use App\Enums\EconomicSector;
use App\Enums\SettlementType;
use App\Enums\StreetType;
use App\Models\Establishment;
use App\Models\Taxpayer;
use App\Support\Legacy\LegacyApplicant;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Builds establishments from dblicencias.lic_tramite. Run after
 * legacy:import-taxpayers: the owner is resolved with the same identity.
 *
 * One establishment per owner + address (street type, street, number,
 * interior); the most recent procedure provides the data. Establishments
 * already present are never overwritten.
 */
#[Signature('legacy:import-establishments')]
#[Description('Importa los establecimientos desde los trámites del sistema legacy (dblicencias)')]
class ImportLegacyEstablishments extends Command
{
    /** lic_sector_eco.see_ide → sector (1 is an empty row). */
    private const array SECTORS = [2 => EconomicSector::Commerce, 3 => EconomicSector::Industry, 4 => EconomicSector::Services];

    private const array SETTLEMENTS = [
        'Acentamiento Humano' => SettlementType::HumanSettlement,
        'Asociacion' => SettlementType::Association,
        'Barrio' => SettlementType::Neighborhood,
        'Centro Poblado' => SettlementType::PopulatedCenter,
        'Provivienda' => SettlementType::HousingProgram,
        'Urbanizacion' => SettlementType::Urbanization,
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // "dni:44865351" => taxpayer id
        $taxpayerIds = Taxpayer::query()
            ->get(['id', 'document_type', 'document_number'])
            ->mapWithKeys(fn (Taxpayer $taxpayer) => [$taxpayer->document_type->value.':'.$taxpayer->document_number => $taxpayer->id])
            ->all();

        /** @var array<string, array<string, mixed>> $establishments keyed by owner + address */
        $establishments = [];
        $skipped = 0;

        DB::connection('legacy')
            ->table('lic_tramite')
            ->lazyById(1000, 'tra_ide')
            ->each(function (object $row) use ($taxpayerIds, &$establishments, &$skipped) {
                $identity = LegacyApplicant::identify($row);
                $taxpayerId = $identity ? ($taxpayerIds[$identity[0]->value.':'.$identity[1]] ?? null) : null;
                $attributes = $taxpayerId ? $this->attributesFrom($row, $taxpayerId) : null;

                if ($attributes === null) {
                    $skipped++;

                    return;
                }

                // Later procedures overwrite earlier ones: the most recent wins.
                $establishments[$this->key($attributes)] = $attributes;
            });

        $existing = Establishment::query()
            ->get(['taxpayer_id', 'street_type', 'street', 'number', 'interior'])
            ->mapWithKeys(fn (Establishment $establishment) => [$this->key([
                'taxpayer_id' => $establishment->taxpayer_id,
                'street_type' => $establishment->street_type,
                'street' => $establishment->street,
                'number' => $establishment->number,
                'interior' => $establishment->interior,
            ]) => true])
            ->all();

        $created = 0;

        foreach ($establishments as $key => $attributes) {
            if (isset($existing[$key])) {
                continue;
            }

            Establishment::create($attributes);
            $created++;
        }

        $this->info("{$created} establecimientos importados ({$skipped} trámites sin contribuyente, giro o dirección).");

        return self::SUCCESS;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function attributesFrom(object $row, int $taxpayerId): ?array
    {
        $activity = $this->clean($row->tra_actividad);
        $street = $this->clean($row->tra_est_dire);

        if ($activity === null || $street === null) {
            return null;
        }

        $length = (float) $row->tra_est_lar;
        $width = (float) $row->tra_est_anc;
        $capacity = $this->clean($row->tra_oest_aforo);

        return [
            'taxpayer_id' => $taxpayerId,
            'trade_name' => $this->limit($this->clean($row->tra_est_nomb), 150),
            'activity' => $this->limit(mb_strtoupper($activity), 255),
            'economic_sector' => self::SECTORS[(int) $row->see_ide_est] ?? null,
            // "AV [Avenida]" => AV
            'street_type' => StreetType::tryFrom(strtok((string) $row->tra_tipo_via_est, ' ') ?: ''),
            'street' => $this->limit(mb_strtoupper($street), 150),
            'number' => $this->limit($this->clean($row->tra_est_nro), 20),
            'interior' => $this->limit($this->clean($row->tra_est_int), 20),
            'block' => $this->limit($this->clean($row->tra_est_mz), 10),
            'lot' => $this->limit($this->clean($row->tra_est_lt), 10),
            'settlement_type' => self::SETTLEMENTS[$row->tra_tipo_habilitacion ?? ''] ?? null,
            'settlement_name' => $this->limit($this->clean($row->tra_nombre_habilitacion) ?? $this->clean($row->tra_est_urb), 100),
            'area' => $length > 0 && $width > 0 ? round($length * $width, 2) : null,
            'capacity' => $capacity !== null && ctype_digit($capacity) && (int) $capacity > 0 ? (int) $capacity : null,
            'legacy_itse_type' => $row->tra_tipo_itse,
            'legacy_procedure_id' => $row->tra_ide,
        ];
    }

    /**
     * Owner + normalized address, e.g. "12|JR|TACNA|246|".
     *
     * @param  array<string, mixed>  $attributes
     */
    private function key(array $attributes): string
    {
        $normalize = fn (?string $value) => preg_replace('/[^A-Z0-9Ñ]+/u', '', mb_strtoupper((string) $value));

        return implode('|', [
            $attributes['taxpayer_id'],
            $attributes['street_type']?->value,
            $normalize($attributes['street']),
            $normalize($attributes['number']),
            $normalize($attributes['interior']),
        ]);
    }

    private function clean(?string $value): ?string
    {
        return LegacyApplicant::clean($value);
    }

    private function limit(?string $value, int $length): ?string
    {
        return $value === null ? null : mb_substr($value, 0, $length);
    }
}
