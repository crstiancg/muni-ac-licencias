<?php

namespace App\Console\Commands;

use App\Models\Market;
use App\Models\MarketCharge;
use App\Models\MarketStall;
use App\Support\Legacy\LegacyApplicant;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Imports dblicencias markets: mer_mercados, mer_comerciantes (one stall per
 * row; codes like "PUESTO" repeat, so no deduplication) and mer_alquileres
 * (yearly payments, imported as paid charges). Placeholder fees (0, 9999.99)
 * are left empty to be set later. Already imported rows are skipped.
 */
#[Signature('legacy:import-markets')]
#[Description('Importa mercados, puestos y pagos de alquiler del sistema legacy (dblicencias)')]
class ImportLegacyMarkets extends Command
{
    private const array TYPES = ['Puesto' => 'puesto', 'Stand' => 'stand', 'Tienda' => 'tienda', 'Kiosko' => 'kiosko'];

    public function handle(): int
    {
        // Bulk migration: not user changes, keep it out of the audit log.
        activity()->disableLogging();

        $legacy = DB::connection('legacy');

        $markets = $legacy->table('mer_mercados')->get()->mapWithKeys(fn (object $row) => [
            $row->mer_ide => Market::firstOrCreate(['legacy_id' => $row->mer_ide], [
                'name' => trim($row->mer_nombre),
                'payment_frequency' => $row->mer_tipo_pago === 'MENSUAL' ? 'mensual' : 'anual',
                'is_active' => true,
            ])->id,
        ]);

        $existingStalls = MarketStall::query()->whereNotNull('legacy_id')->pluck('id', 'legacy_id')->all();
        $stalls = 0;

        $legacy->table('mer_comerciantes')->lazyById(500, 'com_ide')->each(function (object $row) use ($markets, &$existingStalls, &$stalls) {
            if (isset($existingStalls[$row->com_ide]) || ! isset($markets[$row->mer_ide])) {
                return;
            }

            $notes = LegacyApplicant::clean($row->com_obs);
            $fee = (float) $row->com_pago;

            $existingStalls[$row->com_ide] = MarketStall::create([
                'market_id' => $markets[$row->mer_ide],
                'code' => mb_substr(LegacyApplicant::clean($row->com_nro_puesto) ?? 'S/N', 0, 50),
                'stall_type' => self::TYPES[LegacyApplicant::clean($row->com_tipo_puesto) ?? ''] ?? null,
                'activity' => mb_substr((string) LegacyApplicant::clean($row->com_negocio), 0, 150) ?: null,
                'fee' => $fee > 0 && $fee < 9999 ? round($fee, 2) : null,
                'holder_name' => mb_strtoupper((string) LegacyApplicant::clean($row->com_datos)) ?: null,
                'status' => $notes !== null && str_contains(mb_strtolower($notes), 'andonado') ? 'abandonado' : 'activo',
                'notes' => $notes !== null && $notes !== '0' ? mb_substr($notes, 0, 500) : null,
                'legacy_id' => $row->com_ide,
            ])->id;
            $stalls++;
        });

        $importedCharges = MarketCharge::query()->whereNotNull('legacy_id')->pluck('legacy_id')->flip()->all();
        $charges = 0;

        $legacy->table('mer_alquileres')->lazyById(500, 'alq_ide')->each(function (object $row) use ($existingStalls, &$importedCharges, &$charges) {
            $stallId = $existingStalls[$row->com_ide] ?? null;

            if (isset($importedCharges[$row->alq_ide]) || ! $stallId || ! $row->alq_anio) {
                return;
            }

            // One charge per stall and year: a second payment of the same year is skipped.
            $charge = MarketCharge::firstOrCreate(
                ['market_stall_id' => $stallId, 'period_year' => $row->alq_anio, 'period_month' => null],
                [
                    'amount' => round((float) $row->alq_monto, 2),
                    'paid_at' => $row->alq_fecha_reg ? Carbon::parse($row->alq_fecha_reg)->toDateString() : null,
                    'receipt_number' => mb_substr((string) LegacyApplicant::clean($row->alq_nro_recibo), 0, 50) ?: 'SISTEMA ANTERIOR',
                    'legacy_id' => $row->alq_ide,
                ],
            );

            $importedCharges[$row->alq_ide] = true;
            $charges += (int) $charge->wasRecentlyCreated;
        });

        $this->info("{$markets->count()} mercados, {$stalls} puestos y {$charges} pagos históricos importados.");

        return self::SUCCESS;
    }
}
