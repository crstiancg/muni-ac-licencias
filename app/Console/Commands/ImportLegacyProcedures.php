<?php

namespace App\Console\Commands;

use App\Enums\IssuedDocumentType;
use App\Enums\LicenseStatus;
use App\Enums\ProcedureStatus;
use App\Models\Establishment;
use App\Models\License;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use App\Support\Legacy\LegacyApplicant;
use App\Support\Legacy\LegacyEstablishment;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Imports the history of dblicencias: lic_tramite as procedures and
 * lic_licencia (plus sign authorizations recorded only as a procedure status)
 * as licences. Run after the taxpayer and establishment imports.
 *
 * Historical procedures get code H-{tra_ide} and year 0 so they never collide
 * with the yearly numbering of new ones. Already imported rows (legacy_id)
 * are skipped, so it can run again.
 */
#[Signature('legacy:import-procedures')]
#[Description('Importa el historial de trámites y licencias del sistema legacy (dblicencias)')]
class ImportLegacyProcedures extends Command
{
    private const array STATUSES = [
        'REGISTRADO' => ProcedureStatus::Registered,
        'CON ORDEN DE PAGO' => ProcedureStatus::Registered,
        'CON LICENCIA' => ProcedureStatus::Issued,
        'CON AUT. ANUNCIO PUBLICITARIO' => ProcedureStatus::Issued,
        'ANULADO' => ProcedureStatus::Cancelled,
        'INACTIVO' => ProcedureStatus::Cancelled,
    ];

    private const array LICENSE_STATUSES = [
        'ACTIVO' => LicenseStatus::Active,
        'CESE TEMPORAL' => LicenseStatus::TemporarilyClosed,
        'CESE DEFINITIVO' => LicenseStatus::Closed,
        'INACTIVO' => LicenseStatus::Closed,
        'CADUCADO' => LicenseStatus::Expired,
        'ANULADO' => LicenseStatus::Revoked,
    ];

    /** @var array<string, int> "dni:44865351" => taxpayer id */
    private array $taxpayers = [];

    /** @var array<string, int> establishment key => establishment id */
    private array $establishments = [];

    /** @var array<int, int> lic_tipo_tramite.tit_ide => procedure type id */
    private array $types = [];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->loadMaps();

        $imported = Procedure::query()->whereNotNull('legacy_id')->pluck('legacy_id')->flip()->all();
        $importedLicenses = License::query()->whereNotNull('legacy_id')->pluck('legacy_id')->flip()->all();

        // lic_licencia by tra_ide (one per procedure in dblicencias).
        $licenses = DB::connection('legacy')->table('lic_licencia')->get()->keyBy('tra_ide');

        $created = $skipped = $licensesCreated = 0;

        $this->withProgressBar(
            DB::connection('legacy')->table('lic_tramite')->lazyById(500, 'tra_ide'),
            function (object $row) use ($imported, $importedLicenses, $licenses, &$created, &$skipped, &$licensesCreated) {
                if (isset($imported[$row->tra_ide])) {
                    return;
                }

                [$taxpayerId, $establishmentId] = $this->resolve($row);

                if ($establishmentId === null) {
                    $skipped++;

                    return;
                }

                DB::transaction(function () use ($row, $taxpayerId, $establishmentId, $importedLicenses, $licenses, &$created, &$licensesCreated) {
                    $procedure = $this->importProcedure($row, $taxpayerId, $establishmentId);
                    $created++;

                    $license = $licenses->get($row->tra_ide);

                    if ($license && ! isset($importedLicenses[(int) $license->lic_ide])) {
                        $this->importLicense($row, $procedure, $license);
                        $licensesCreated++;
                    } elseif (! $license && $row->tra_estado === 'CON AUT. ANUNCIO PUBLICITARIO') {
                        // Sign authorizations were recorded only as a procedure status.
                        $this->importLicense($row, $procedure, null);
                        $licensesCreated++;
                    }
                });
            },
        );

        $this->newLine();
        $this->info("{$created} trámites y {$licensesCreated} licencias/autorizaciones importados ({$skipped} trámites sin contribuyente o establecimiento identificable).");

        return self::SUCCESS;
    }

    private function loadMaps(): void
    {
        $this->taxpayers = Taxpayer::query()
            ->get(['id', 'document_type', 'document_number'])
            ->mapWithKeys(fn (Taxpayer $taxpayer) => [$taxpayer->document_type->value.':'.$taxpayer->document_number => $taxpayer->id])
            ->all();

        $this->establishments = Establishment::query()
            ->get(['id', 'taxpayer_id', 'street_type', 'street', 'number', 'interior'])
            ->mapWithKeys(fn (Establishment $establishment) => [
                LegacyEstablishment::key($establishment->taxpayer_id, $establishment->street_type, $establishment->street, $establishment->number, $establishment->interior) => $establishment->id,
            ])
            ->all();

        $this->types = ProcedureType::query()->whereNotNull('legacy_id')->pluck('id', 'legacy_id')->all();
    }

    /**
     * @return array{0: int|null, 1: int|null} [taxpayer id, establishment id]
     */
    private function resolve(object $row): array
    {
        $identity = LegacyApplicant::identify($row);
        $taxpayerId = $identity ? ($this->taxpayers[$identity[0]->value.':'.$identity[1]] ?? null) : null;

        if ($taxpayerId === null) {
            return [null, null];
        }

        return [$taxpayerId, $this->establishments[LegacyEstablishment::keyFromRow($taxpayerId, $row)] ?? null];
    }

    private function importProcedure(object $row, int $taxpayerId, int $establishmentId): Procedure
    {
        // Unknown dates go to 2000-01-01 instead of today, so history never looks recent.
        $registeredAt = $this->date($row->tra_fech_reg) ?? $this->date($row->tra_fech_modi) ?? Carbon::create(2000);
        $status = self::STATUSES[$row->tra_estado] ?? ProcedureStatus::Registered;
        $folios = LegacyApplicant::clean($row->tra_folios);

        $procedure = new Procedure([
            'year' => 0,
            'sequence' => $row->tra_ide,
            'code' => "H-{$row->tra_ide}",
            'taxpayer_id' => $taxpayerId,
            'establishment_id' => $establishmentId,
            'status' => $status,
            'file_number' => mb_substr((string) LegacyApplicant::clean($row->tra_nro_expe), 0, 50) ?: null,
            'folios' => $folios !== null && ctype_digit($folios) && (int) $folios <= 9999 ? (int) $folios : null,
            'notes' => LegacyApplicant::clean($row->tra_obs),
            'cancelled_at' => $status === ProcedureStatus::Cancelled ? ($this->date($row->tra_fech_modi) ?? $registeredAt) : null,
            'cancellation_reason' => $status === ProcedureStatus::Cancelled ? 'Anulado en el sistema anterior.' : null,
            'legacy_id' => $row->tra_ide,
        ]);
        $procedure->created_at = $registeredAt;
        $procedure->updated_at = $this->date($row->tra_fech_modi) ?? $registeredAt;
        $procedure->save();

        $typeIds = collect(explode(',', (string) $row->tra_tit_ides))
            ->map(fn (string $id) => $this->types[(int) trim($id)] ?? null)
            ->filter()
            ->unique()
            ->values()
            ->all();
        $procedure->types()->attach($typeIds);

        $event = $procedure->events()->make([
            'type' => 'importado',
            'description' => collect([
                "Trámite N° {$row->tra_ide} del sistema anterior ({$row->tra_estado})",
                $row->tra_monto_total ? 'monto S/ '.number_format((float) $row->tra_monto_total, 2) : null,
                ($receipt = LegacyApplicant::clean($row->tra_cpag)) ? "comprobante {$receipt}" : null,
                ($resolution = LegacyApplicant::clean($row->tra_nro_resolucion)) ? "resolución {$resolution}" : null,
            ])->filter()->join(', ').'.',
        ]);
        $event->created_at = $registeredAt;
        $event->save();

        return $procedure;
    }

    private function importLicense(object $row, Procedure $procedure, ?object $legacy): void
    {
        $type = $row->tra_estado === 'CON AUT. ANUNCIO PUBLICITARIO'
            ? IssuedDocumentType::SignAuthorization
            : IssuedDocumentType::OperatingLicense;

        // Invalid (0000-00-00) or future dates fall back to the procedure's.
        $issuedAt = $this->date($legacy?->lic_fech_emi)
            ?? $this->date($row->tra_fech_cpag)
            ?? $this->date($row->tra_fech_modi)
            ?? $procedure->created_at;

        $establishment = $procedure->establishment;
        $identity = LegacyApplicant::identify($row);

        License::create([
            'type' => $type,
            'year' => $issuedAt->year,
            'sequence' => null,
            'number' => LegacyApplicant::clean($row->tra_nro_lice) ?? ($legacy ? "L-{$legacy->lic_ide}" : "A-{$row->tra_ide}"),
            'procedure_id' => $procedure->id,
            'taxpayer_id' => $procedure->taxpayer_id,
            'establishment_id' => $establishment->id,
            'issued_at' => $issuedAt,
            'status' => $legacy ? (self::LICENSE_STATUSES[$legacy->lic_estado] ?? LicenseStatus::Active) : LicenseStatus::Active,
            'status_reason' => $legacy ? LegacyApplicant::clean($legacy->lic_obs) : null,
            'holder_name' => mb_strtoupper((string) LegacyApplicant::clean($row->tra_nombre)),
            'holder_document' => strtoupper($identity[0]->value).' '.$identity[1],
            'trade_name' => $establishment->trade_name,
            'activity' => $establishment->activity,
            'address' => $establishment->full_address,
            'area' => $establishment->area,
            'capacity' => $establishment->capacity,
            'sign_kind' => $type === IssuedDocumentType::SignAuthorization ? ($row->tra_anu_lumi === 'SI' ? 'luminoso' : 'simple') : null,
            'sign_faces' => $type === IssuedDocumentType::SignAuthorization && ctype_digit((string) LegacyApplicant::clean($row->tra_anu_cara)) ? min((int) $row->tra_anu_cara, 255) : null,
            'sign_material' => $type === IssuedDocumentType::SignAuthorization ? (mb_substr((string) LegacyApplicant::clean($row->tra_anu_mat), 0, 100) ?: null) : null,
            'sign_width' => $type === IssuedDocumentType::SignAuthorization && (float) $row->tra_anu_largo > 0 ? $row->tra_anu_largo : null,
            'sign_height' => $type === IssuedDocumentType::SignAuthorization && (float) $row->tra_anu_alto > 0 ? $row->tra_anu_alto : null,
            'legacy_id' => $legacy?->lic_ide,
        ]);
    }

    /**
     * Legacy dates may be NULL, 0000-00-00 or typos (year 0110, 2031): only
     * dates between 1990 and today are trusted.
     */
    private function date(?string $value): ?Carbon
    {
        if ($value === null || str_starts_with($value, '0000')) {
            return null;
        }

        try {
            $date = Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }

        return $date->year >= 1990 && ! $date->isFuture() ? $date : null;
    }
}
