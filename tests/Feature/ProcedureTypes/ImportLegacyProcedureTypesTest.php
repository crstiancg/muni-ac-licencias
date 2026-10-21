<?php

namespace Tests\Feature\ProcedureTypes;

use App\Enums\RiskLevel;
use App\Models\ProcedureType;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ImportLegacyProcedureTypesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // In-memory stand-in for dblicencias with only the columns the import reads.
        config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('legacy');

        Schema::connection('legacy')->create('lic_tipo_tramite', function (Blueprint $table) {
            $table->integer('tit_ide')->primary();
            $table->string('tit_nombre');
            $table->text('tit_desc')->nullable();
            $table->char('tit_estado', 1);
            $table->double('tit_orden')->nullable();
        });

        Schema::connection('legacy')->create('lic_tipo_orden', function (Blueprint $table) {
            $table->integer('tor_ide')->primary();
            $table->double('tor_porciento_uit')->nullable();
            $table->double('tor_monto')->nullable();
        });

        DB::connection('legacy')->table('lic_tipo_tramite')->insert([
            ['tit_ide' => 3, 'tit_nombre' => 'ANUNCIO ADOSADO ', 'tit_desc' => null, 'tit_estado' => 'Y', 'tit_orden' => 25],
            ['tit_ide' => 8, 'tit_nombre' => 'OTROS', 'tit_desc' => null, 'tit_estado' => 'X', 'tit_orden' => null],
            ['tit_ide' => 36, 'tit_nombre' => 'LICENCIA PARA EDIFICACIONES CON NIVEL DE RIESGO MEDIO (Con ITSE posterior)', 'tit_desc' => null, 'tit_estado' => 'A', 'tit_orden' => 2],
            ['tit_ide' => 38, 'tit_nombre' => 'LICENCIA PARA EDIFICACIONES CON NIVEL DE RIESGO MUY ALTO (Con ITSE previa)', 'tit_desc' => 'Detalle', 'tit_estado' => 'A', 'tit_orden' => 4],
            ['tit_ide' => 37, 'tit_nombre' => 'LICENCIA PARA EDIFICACIONES CON NIVEL DE RIESGO ALTO (Con ITSE previa)', 'tit_desc' => null, 'tit_estado' => 'A', 'tit_orden' => 3],
            ['tit_ide' => 50, 'tit_nombre' => 'CIERRE TEMPORAL', 'tit_desc' => null, 'tit_estado' => 'A', 'tit_orden' => 2.5],
            ['tit_ide' => 52, 'tit_nombre' => 'SIN ORDEN DE PAGO', 'tit_desc' => null, 'tit_estado' => 'A', 'tit_orden' => 9],
        ]);

        DB::connection('legacy')->table('lic_tipo_orden')->insert([
            ['tor_ide' => 3, 'tor_porciento_uit' => 2.0143, 'tor_monto' => 99.71],
            ['tor_ide' => 8, 'tor_porciento_uit' => null, 'tor_monto' => null],
            ['tor_ide' => 36, 'tor_porciento_uit' => 4.539130434782609, 'tor_monto' => 208.80],
            ['tor_ide' => 37, 'tor_porciento_uit' => 5.717391304347826, 'tor_monto' => 263.00],
            ['tor_ide' => 38, 'tor_porciento_uit' => 4.836956521739131, 'tor_monto' => 222.50],
            ['tor_ide' => 50, 'tor_porciento_uit' => 0.4173737373737374, 'tor_monto' => 19.20],
        ]);
    }

    public function test_it_merges_both_legacy_catalogs_into_procedure_types()
    {
        $this->artisan('legacy:import-procedure-types')
            ->expectsOutputToContain('7 tipos de trámite importados')
            ->assertSuccessful();

        $this->assertDatabaseCount('procedure_types', 7);

        $type = ProcedureType::query()->where('legacy_id', 38)->sole();

        $this->assertSame('LICENCIA PARA EDIFICACIONES CON NIVEL DE RIESGO MUY ALTO (Con ITSE previa)', $type->name);
        $this->assertSame('Detalle', $type->description);
        $this->assertSame('4.8370', $type->uit_percentage);
        $this->assertSame('222.50', $type->legacy_amount);
        $this->assertSame(RiskLevel::VeryHigh, $type->risk_level);
        $this->assertTrue($type->is_active);
    }

    public function test_only_status_a_is_imported_as_active_and_names_are_trimmed()
    {
        $this->artisan('legacy:import-procedure-types')->assertSuccessful();

        $old = ProcedureType::query()->where('legacy_id', 3)->sole();

        $this->assertFalse($old->is_active);
        $this->assertSame('ANUNCIO ADOSADO', $old->name);
        $this->assertNull($old->risk_level);
        $this->assertSame(5, ProcedureType::query()->where('is_active', true)->count());
    }

    public function test_risk_level_is_parsed_from_the_name()
    {
        $this->artisan('legacy:import-procedure-types')->assertSuccessful();

        $this->assertSame(RiskLevel::Medium, ProcedureType::query()->where('legacy_id', 36)->value('risk_level'));
        $this->assertSame(RiskLevel::High, ProcedureType::query()->where('legacy_id', 37)->value('risk_level'));
    }

    public function test_missing_payment_order_imports_a_zero_percentage()
    {
        $this->artisan('legacy:import-procedure-types')->assertSuccessful();

        $type = ProcedureType::query()->where('legacy_id', 52)->sole();

        $this->assertSame('0.0000', $type->uit_percentage);
        $this->assertNull($type->legacy_amount);
        $this->assertSame('0.0000', ProcedureType::query()->where('legacy_id', 8)->value('uit_percentage'));
    }

    public function test_positions_put_active_types_first_in_legacy_order()
    {
        $this->artisan('legacy:import-procedure-types')->assertSuccessful();

        $this->assertSame(
            [36 => 1, 50 => 2, 37 => 3, 38 => 4, 52 => 5, 3 => 6, 8 => 7],
            ProcedureType::query()->orderBy('position')->pluck('position', 'legacy_id')->all(),
        );
    }

    public function test_running_it_again_keeps_edits_made_in_the_new_system()
    {
        $this->artisan('legacy:import-procedure-types')->assertSuccessful();
        ProcedureType::query()->where('legacy_id', 36)->update(['name' => 'EDITADO', 'tupa_code' => 'PA-02']);

        $this->artisan('legacy:import-procedure-types')
            ->expectsOutputToContain('0 tipos de trámite importados')
            ->assertSuccessful();

        $this->assertDatabaseCount('procedure_types', 7);
        $this->assertSame('EDITADO', ProcedureType::query()->where('legacy_id', 36)->value('name'));
    }
}
