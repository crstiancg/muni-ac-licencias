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

    private function issueLicense(array $taxpayer = [], array $declaration = []): License
    {
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $establishment = Establishment::factory()->create([
            'trade_name' => 'CARNES DON JOSE',
            'activity' => 'CARNICERIA',
            'area' => 40,
            'capacity' => 15,
        ]);
        if ($taxpayer) {
            $establishment->taxpayer->update($taxpayer);
        }
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']);

        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false, ...$declaration],
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
            ->assertSee('<div class="f" style="left:38.7mm;top:105mm">'.e($license->holder_name).'</div>', false)
            // A natural person: the "Razón social" line stays blank.
            ->assertSee('<div class="f" style="left:38.7mm;top:122mm"></div>', false)
            // The class of establishment carries the trade name.
            ->assertSee('CARNICERIA - CARNES DON JOSE')
            ->assertSee($license->address)
            ->assertSee('PROHIBIDO OCUPACION DE LA VIA PUBLICA')
            ->assertSee('208.20')
            ->assertSeeInOrder(['DOSCIENTOS OCHO CON 20/100', 'SOLES'])
            ->assertSee('2026-00049928')
            ->assertSee('44025')
            // The sheet has the crest pre-printed but not the procedure code under it.
            ->assertSee('class="f crest-code" style="left:8mm;top:54mm;width:41mm">C.T. '.$license->procedure->code.'</div>', false)
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
            ->assertSeeInOrder(['Apellidos y Nombres', $license->holder_name, 'Razón social del Establecimiento', '<div class="value"></div>', 'Clase de Establecimiento'], false)
            ->assertSee('CARNICERIA - CARNES DON JOSE')
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

    public function test_a_company_licence_prints_its_representative_as_name_and_itself_as_razon_social()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');
        $license = $this->issueLicense(
            ['document_type' => 'ruc', 'document_number' => '20616230949', 'ruc' => null, 'name' => 'GRUPO THARWAH S.A.C.', 'representative_name' => 'REPRESENTANTE DE LA FICHA'],
            ['representative_name' => 'GUERRA VASQUEZ JOCELIN MILAGROS', 'representative_sunarp' => '11023456'],
        );

        $this->actingAs($clerk)
            ->get(route('licenses.print', $license))
            ->assertSee('<div class="f" style="left:38.7mm;top:105mm">GUERRA VASQUEZ JOCELIN MILAGROS</div>', false)
            ->assertSee('<div class="f" style="left:38.7mm;top:122mm">GRUPO THARWAH S.A.C.</div>', false)
            ->assertDontSee('REPRESENTANTE DE LA FICHA');

        $this->actingAs($clerk)
            ->get(route('licenses.print', [$license, 'blank' => 1]))
            ->assertSeeInOrder(['Apellidos y Nombres', 'GUERRA VASQUEZ JOCELIN MILAGROS', 'Razón social del Establecimiento', 'GRUPO THARWAH S.A.C.', 'Clase de Establecimiento']);

        // Licences without a declared representative take the company's file.
        $license->procedure->update(['declaration' => collect($license->procedure->declaration)->except('representative_name')->all()]);

        $this->actingAs($clerk)
            ->get(route('licenses.print', $license))
            ->assertSee('REPRESENTANTE DE LA FICHA');
    }
}
