<?php

namespace App\Console\Commands;

use App\Enums\RiskLevel;
use App\Models\ProcedureType;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Merges dblicencias lic_tipo_tramite + lic_tipo_orden (same ids) into
 * procedure_types. Only types missing by legacy_id are created, so running it
 * again never overwrites edits made in the new system.
 */
#[Signature('legacy:import-procedure-types')]
#[Description('Importa los tipos de trámite del sistema legacy (dblicencias)')]
class ImportLegacyProcedureTypes extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $rows = DB::connection('legacy')
            ->table('lic_tipo_tramite as t')
            ->leftJoin('lic_tipo_orden as o', 'o.tor_ide', '=', 't.tit_ide')
            ->get(['t.tit_ide', 't.tit_nombre', 't.tit_desc', 't.tit_estado', 't.tit_orden', 'o.tor_porciento_uit', 'o.tor_monto'])
            // Legacy "A" is the current TUPA; "X" and "Y" were 2015/2016 ones.
            // Active first, each group in legacy order with unordered ones last.
            ->sortBy([
                fn ($a, $b) => ($b->tit_estado === 'A') <=> ($a->tit_estado === 'A'),
                fn ($a, $b) => ($a->tit_orden === null) <=> ($b->tit_orden === null),
                fn ($a, $b) => $a->tit_orden <=> $b->tit_orden,
                fn ($a, $b) => $a->tit_ide <=> $b->tit_ide,
            ])
            ->values();

        $created = 0;

        foreach ($rows as $index => $row) {
            $type = ProcedureType::firstOrCreate(['legacy_id' => $row->tit_ide], [
                'name' => trim($row->tit_nombre),
                'description' => $row->tit_desc,
                'uit_percentage' => round((float) $row->tor_porciento_uit, 4),
                'risk_level' => $this->riskLevelFrom($row->tit_nombre),
                'position' => $index + 1,
                'is_active' => $row->tit_estado === 'A',
                'legacy_amount' => $row->tor_monto,
            ]);

            $created += (int) $type->wasRecentlyCreated;
        }

        $this->info("{$created} tipos de trámite importados ({$rows->count()} en legacy).");

        return self::SUCCESS;
    }

    /**
     * The 2022 TUPA names carry the risk level: "... NIVEL DE RIESGO MUY ALTO ...".
     */
    private function riskLevelFrom(string $name): ?RiskLevel
    {
        return match (true) {
            str_contains($name, 'RIESGO MUY ALTO') => RiskLevel::VeryHigh,
            str_contains($name, 'RIESGO ALTO') => RiskLevel::High,
            str_contains($name, 'RIESGO MEDIO') => RiskLevel::Medium,
            str_contains($name, 'RIESGO BAJO') => RiskLevel::Low,
            default => null,
        };
    }
}
