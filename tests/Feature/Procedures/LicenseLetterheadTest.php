<?php

namespace Tests\Feature\Procedures;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Models\Establishment;
use App\Models\License;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LicenseLetterheadTest extends TestCase
{
    use RefreshDatabase;

    private function issueLicense(): License
    {
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $establishment = Establishment::factory()->create([
            'trade_name' => 'CARNES DON JOSE',
            'activity' => 'CARNICERIA',
            'area' => 40,
            'capacity' => 15,
        ]);
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']);

        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);
        $procedure->update(['file_number' => '2026-00049928']);

        $order = app(IssuePaymentOrder::class)->handle($procedure->load('types'));
        app(RegisterPayment::class)->handle($order, '44025', now()->toDateString());

        return app(IssueDocuments::class)->handle($procedure->fresh(), [], null, null)->first();
    }

    public function test_the_procedure_file_presents_its_issued_licence()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');
        $license = $this->issueLicense();

        $this->actingAs($clerk)
            ->get(route('procedures.show', $license->procedure_id))
            ->assertInertia(fn (Assert $page) => $page
                ->where('procedure.licenses.0.number', $license->number)
                ->where('procedure.licenses.0.type', 'licencia')
                ->where('procedure.licenses.0.series', null)
                ->where('procedure.licenses.0.trade_name', 'CARNES DON JOSE')
                ->where('procedure.licenses.0.activity', 'CARNICERIA')
                ->where('procedure.licenses.0.holder_name', $license->holder_name)
                ->where('procedure.licenses.0.valid_until', null)
                ->where('procedure.licenses.0.verification_url', $license->verificationUrl())
                ->where('procedure.licenses.0.qr', fn (string $qr) => str_starts_with($qr, 'data:image/svg+xml;base64,'))
            );
    }

    public function test_the_operating_licence_prints_its_data_on_the_letterhead()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');
        $license = $this->issueLicense();

        $this->actingAs($clerk)
            ->get(route('licenses.print', $license))
            ->assertOk()
            ->assertSee('class="letterhead"', false)
            ->assertSee($license->holder_name)
            ->assertSee('CARNES DON JOSE')
            ->assertSee('CARNICERIA')
            ->assertSee($license->address)
            ->assertSee('PROHIBIDO OCUPACION DE LA VIA PUBLICA')
            ->assertSee('208.20')
            ->assertSeeInOrder(['DOSCIENTOS OCHO CON 20/100', 'SOLES'])
            ->assertSee('2026-00049928')
            ->assertSee('44025')
            // The sheet has the crest pre-printed but not the procedure code under it.
            ->assertSee('class="f crest-code" style="left:16mm;top:52.5mm;width:41mm">C.T. '.$license->procedure->code.'</div>', false)
            ->assertSee('class="qr" src="data:image/svg+xml;base64,', false);
    }

    public function test_the_operating_licence_prints_the_whole_design_on_a_blank_sheet()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');
        $license = $this->issueLicense();
        $license->update(['series' => '0010234']);

        $this->actingAs($clerk)
            ->get(route('licenses.print', [$license, 'blank' => 1]))
            ->assertOk()
            ->assertSee('class="sheet"', false)
            ->assertDontSee('class="letterhead"', false)
            ->assertSee('0010234')
            ->assertSee(mb_strtoupper(config('licencias.municipality')))
            ->assertSee('Licencia de funcionamiento para establecimiento')
            ->assertSeeInOrder(['Apellidos y Nombres', $license->holder_name, 'Razón social del Establecimiento', 'CARNES DON JOSE'])
            ->assertSee('CARNICERIA')
            ->assertSee($license->address)
            ->assertSee('PROHIBIDO OCUPACION DE LA VIA PUBLICA')
            ->assertSeeInOrder(['208.20', 'DOSCIENTOS OCHO CON 20/100', 'SOLES'])
            ->assertSee('2026-00049928')
            ->assertSee('44025')
            ->assertSeeInOrder(['SERIE - A', '0010234'])
            ->assertSee('<div class="crest-code condensed">C.T. '.$license->procedure->code.'</div>', false)
            ->assertSeeInOrder([mb_strtoupper(config('licencias.municipality')), 'Gerencia de Desarrollo Económico', 'Subgerencia de Actividades Económicas'])
            ->assertSeeInOrder(['Emisor', 'Sub Gerencia de Actividades', 'Gerencia de Desarrollo'])
            ->assertDontSee('Turismo')
            ->assertSee('class="qr" src="data:image/svg+xml;base64,', false);
    }
}
