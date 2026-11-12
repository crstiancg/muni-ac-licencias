<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * legacy:sync brings dblicencias into the system in dependency order and can
 * run again any day: each importer skips what it already brought.
 */
class LegacySyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_stops_before_importing_when_the_old_database_is_unreachable()
    {
        config(['database.connections.legacy' => [
            'driver' => 'mysql',
            'host' => '127.0.0.1',
            'port' => '1',
            'database' => 'dblicencias',
            'username' => 'nobody',
            'password' => '',
        ]]);
        DB::purge('legacy');

        $this->artisan('legacy:sync')
            ->expectsOutputToContain('LEGACY_DB_HOST')
            ->assertFailed();

        $this->assertDatabaseCount('procedure_types', 0);
    }

    public function test_it_imports_in_dependency_order_and_stops_at_the_first_failure()
    {
        // Only the procedure-type tables exist: step 1 works, step 2
        // (taxpayers, from lic_tramite) fails, so procedures never run
        // without their taxpayers.
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
            'tit_ide' => 36, 'tit_nombre' => 'LICENCIA DE FUNCIONAMIENTO', 'tit_desc' => null, 'tit_estado' => 'A', 'tit_orden' => 1,
        ]);

        $this->artisan('legacy:sync')
            ->expectsOutputToContain('Contribuyentes')
            ->assertFailed();

        $this->assertDatabaseCount('procedure_types', 1);
        $this->assertDatabaseCount('taxpayers', 0);
        $this->assertDatabaseCount('procedures', 0);
    }
}
