<?php

namespace App\Console\Commands;

use App\Enums\DocumentType;
use App\Models\Taxpayer;
use App\Support\Legacy\LegacyApplicant;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Builds taxpayers from dblicencias.lic_tramite, where the applicant was
 * retyped in every procedure. One taxpayer per document; the most recent
 * procedure provides the data. Existing taxpayers are never overwritten, so
 * running it again keeps edits made in the new system.
 *
 * Procedures before 2011 (migrated from an older system) mostly have no
 * document and are skipped: their history keeps the typed name.
 */
#[Signature('legacy:import-taxpayers')]
#[Description('Importa los contribuyentes desde los trámites del sistema legacy (dblicencias)')]
class ImportLegacyTaxpayers extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // Bulk migration: not user changes, keep it out of the audit log.
        activity()->disableLogging();

        /** @var array<string, array<string, mixed>> $taxpayers keyed by "type:number" */
        $taxpayers = [];
        $skipped = 0;

        DB::connection('legacy')
            ->table('lic_tramite')
            ->lazyById(1000, 'tra_ide')
            ->each(function (object $row) use (&$taxpayers, &$skipped) {
                $attributes = $this->attributesFrom($row);

                if ($attributes === null) {
                    $skipped++;

                    return;
                }

                // Later procedures overwrite earlier ones: the most recent wins.
                $taxpayers[$attributes['document_type']->value.':'.$attributes['document_number']] = $attributes;
            });

        $created = 0;
        $usedRucs = Taxpayer::query()->whereNotNull('ruc')->pluck('ruc')->flip()->all();

        foreach ($taxpayers as $attributes) {
            // A mistyped RUC repeated on two people would break the unique index.
            if ($attributes['ruc'] !== null && isset($usedRucs[$attributes['ruc']])) {
                $attributes['ruc'] = null;
            }

            $taxpayer = Taxpayer::firstOrCreate(
                ['document_type' => $attributes['document_type'], 'document_number' => $attributes['document_number']],
                $attributes,
            );

            if ($taxpayer->wasRecentlyCreated) {
                $created++;

                if ($taxpayer->ruc !== null) {
                    $usedRucs[$taxpayer->ruc] = true;
                }
            }
        }

        $this->info("{$created} contribuyentes importados ({$skipped} trámites sin documento o nombre válido).");

        return self::SUCCESS;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function attributesFrom(object $row): ?array
    {
        $name = $this->clean($row->tra_nombre);
        $identity = LegacyApplicant::identify($row);

        if ($name === null || $identity === null) {
            return null;
        }

        [$type, $number, $naturalRuc] = $identity;

        return [
            'document_type' => $type,
            'document_number' => $number,
            'ruc' => $naturalRuc,
            'name' => mb_strtoupper($name),
            'email' => $this->clean($row->tra_email),
            'phone' => $this->clean($row->tra_tel),
            'address' => $this->address($row),
            'district' => $this->clean($row->tra_dist),
            'province' => $this->clean($row->tra_prov),
            'department' => $this->clean($row->tra_depa),
            'representative_name' => $type === DocumentType::Ruc ? $this->clean($row->tra_rep_nom) : null,
            'representative_document' => $type === DocumentType::Ruc ? $this->clean($row->tra_rep_nr_doc) : null,
            'representative_sunarp' => $type === DocumentType::Ruc ? $this->clean($row->tra_rep_nsunarp) : null,
            'representative_phone' => $type === DocumentType::Ruc ? $this->clean($row->tra_rep_tel) : null,
            'legacy_procedure_id' => $row->tra_ide,
        ];
    }

    /**
     * "JR. LIMA N° 123 Int. 2 Mz. B Lt. 4 URB. X" from the split legacy columns.
     */
    private function address(object $row): ?string
    {
        $parts = array_filter([
            $this->clean($row->tra_direc),
            ($nro = $this->clean($row->tra_dir_nro)) ? "N° {$nro}" : null,
            ($int = $this->clean($row->tra_dir_int)) ? "Int. {$int}" : null,
            ($mz = $this->clean($row->tra_dir_mz)) ? "Mz. {$mz}" : null,
            ($lt = $this->clean($row->tra_dir_lt)) ? "Lt. {$lt}" : null,
            $this->clean($row->tra_urb),
        ]);

        return $parts === [] ? null : mb_substr(implode(' ', $parts), 0, 255);
    }

    private function clean(?string $value): ?string
    {
        return LegacyApplicant::clean($value);
    }
}
