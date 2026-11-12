<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Brings the old system (dblicencias) into this one, in dependency order.
 * Safe to run any day while both systems coexist: every importer skips what
 * it already brought (by legacy id) and never overwrites work done here, so
 * each run only adds what is new. Records edited in the old system after
 * being imported are not updated.
 */
#[Signature('legacy:sync')]
#[Description('Importa del sistema anterior lo que aún no se trajo (se puede repetir)')]
class SyncLegacy extends Command
{
    /** Each step needs the ones before it: procedures need their taxpayers and establishments. */
    private const array STEPS = [
        'legacy:import-procedure-types' => 'Tipos de trámite',
        'legacy:import-taxpayers' => 'Contribuyentes',
        'legacy:import-establishments' => 'Establecimientos',
        'legacy:import-procedures' => 'Trámites y licencias',
        'legacy:import-markets' => 'Mercados',
    ];

    public function handle(): int
    {
        try {
            DB::connection('legacy')->getPdo();
        } catch (Throwable $e) {
            $this->error('No se pudo conectar a la base del sistema anterior: '.$e->getMessage());
            $this->line('Revisa LEGACY_DB_HOST, LEGACY_DB_PORT, LEGACY_DB_DATABASE, LEGACY_DB_USERNAME y LEGACY_DB_PASSWORD.');

            return self::FAILURE;
        }

        foreach (self::STEPS as $command => $label) {
            $this->components->info($label);

            try {
                $status = $this->call($command);
            } catch (Throwable $e) {
                $this->error($e->getMessage());
                $status = self::FAILURE;
            }

            if ($status !== self::SUCCESS) {
                $this->error("Se detuvo en «{$label}»: los pasos siguientes dependen de este. Corrige y vuelve a ejecutar legacy:sync; lo ya importado no se duplica.");

                return self::FAILURE;
            }
        }

        $this->components->info('Sistema anterior sincronizado.');

        return self::SUCCESS;
    }
}
