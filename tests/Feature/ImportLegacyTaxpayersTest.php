<?php

namespace Tests\Feature;

use App\Models\Taxpayer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The old system typed the applicant's address in split columns (street,
 * number, interior, block, lot, settlement): they arrive split, as the
 * sworn declaration prints them.
 */
class ImportLegacyTaxpayersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.connections.legacy' => ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']]);
        DB::purge('legacy');

        Schema::connection('legacy')->create('lic_tramite', function (Blueprint $table) {
            $table->integer('tra_ide')->primary();
            foreach ([
                'tra_nombre', 'tra_dni_ce', 'tra_ruc', 'tra_email', 'tra_tel',
                'tra_direc', 'tra_dir_nro', 'tra_dir_int', 'tra_dir_mz', 'tra_dir_lt', 'tra_urb',
                'tra_dist', 'tra_prov', 'tra_depa',
                'tra_rep_nom', 'tra_rep_nr_doc', 'tra_rep_nsunarp', 'tra_rep_tel',
            ] as $column) {
                $table->string($column)->nullable();
            }
        });
    }

    private function procedure(int $id, string $dni, array $address): void
    {
        DB::connection('legacy')->table('lic_tramite')->insert([
            'tra_ide' => $id,
            'tra_nombre' => 'QUISPE MAMANI ANA',
            'tra_dni_ce' => $dni,
            'tra_dist' => 'PUNO',
            'tra_prov' => 'PUNO',
            'tra_depa' => 'PUNO',
            ...$address,
        ]);
    }

    private const array ADDRESS = [
        'tra_direc' => 'JR. LIMA',
        'tra_dir_nro' => '123',
        'tra_dir_int' => '2',
        'tra_dir_mz' => 'B',
        'tra_dir_lt' => '4',
        'tra_urb' => 'URB. CHANU CHANU',
    ];

    public function test_the_applicant_address_arrives_split()
    {
        $this->procedure(1, '01234567', self::ADDRESS);

        $this->artisan('legacy:import-taxpayers')->assertSuccessful();

        $taxpayer = Taxpayer::sole();
        $this->assertSame(
            ['JR. LIMA', '123', '2', 'B', '4', 'URB. CHANU CHANU'],
            [$taxpayer->address, $taxpayer->number, $taxpayer->interior, $taxpayer->block, $taxpayer->lot, $taxpayer->settlement],
        );
    }

    public function test_long_legacy_values_are_cut_to_the_column()
    {
        $this->procedure(1, '01234567', [...self::ADDRESS, 'tra_dir_mz' => 'MANZANA B SECTOR ALTO', 'tra_dir_nro' => str_repeat('9', 30)]);

        $this->artisan('legacy:import-taxpayers')->assertSuccessful();

        $this->assertSame('MANZANA B', Taxpayer::sole()->block);
        $this->assertSame(str_repeat('9', 20), Taxpayer::sole()->number);
    }

    public function test_taxpayers_imported_with_the_address_joined_get_it_split_unless_edited_here()
    {
        $this->procedure(1, '01234567', self::ADDRESS);
        $this->procedure(2, '07654321', self::ADDRESS);

        // How the first import left them: everything in one text.
        $joined = 'JR. LIMA N° 123 Int. 2 Mz. B Lt. 4 URB. CHANU CHANU';
        $untouched = Taxpayer::factory()->create(['document_number' => '01234567', 'address' => $joined]);
        $edited = Taxpayer::factory()->create(['document_number' => '07654321', 'address' => 'AV. EL SOL 456']);

        $this->artisan('legacy:import-taxpayers')
            ->expectsOutputToContain('1 domicilios separados')
            ->assertSuccessful();

        $untouched->refresh();
        $this->assertSame(['JR. LIMA', '123', 'URB. CHANU CHANU'], [$untouched->address, $untouched->number, $untouched->settlement]);
        $this->assertSame('AV. EL SOL 456', $edited->fresh()->address);
        $this->assertNull($edited->fresh()->number);
    }
}
