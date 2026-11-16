<?php

namespace Tests\Feature\Licenses;

use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Models\Establishment;
use App\Models\License;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The observations printed on the operating licence start from the standard
 * warning, which can be edited per licence. What is saved is what prints:
 * a later change of the standard text never alters an issued licence.
 */
class LicenseObservationsTest extends TestCase
{
    use RefreshDatabase;

    private const STANDARD = 'TEXTO ESTANDAR DE PRUEBA.';

    private User $clerk;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->clerk = User::factory()->create();
        $this->clerk->assignRole('Mesa de partes');
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        config(['licencias.license_observations' => self::STANDARD]);
    }

    private function paidProcedure(): Procedure
    {
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']);

        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);

        $order = app(IssuePaymentOrder::class)->handle($procedure->load('types'));
        app(RegisterPayment::class)->handle($order, '44025', now()->toDateString());

        return $procedure->fresh();
    }

    private function issue(array $data = []): License
    {
        $this->actingAs($this->clerk)
            ->post(route('procedures.documents.store', $this->paidProcedure()), ['series' => ['licencia' => (string) random_int(100000, 999999)], ...$data])
            ->assertSessionHasNoErrors();

        return License::query()->latest('id')->first();
    }

    public function test_the_issue_form_suggests_the_standard_text()
    {
        $procedure = $this->paidProcedure();

        $this->actingAs($this->clerk)
            ->get(route('procedures.show', $procedure))
            ->assertInertia(fn (Assert $page) => $page
                ->where('procedure.default_observations', self::STANDARD)
                ->where('procedure.observations_max', License::OBSERVATIONS_MAX)
            );
    }

    public function test_the_edited_text_is_saved_and_printed()
    {
        $license = $this->issue(['observations' => ' HORARIO HASTA LAS 23:00. SIN VENTA DE BEBIDAS ALCOHOLICAS. ']);

        $this->assertSame('HORARIO HASTA LAS 23:00. SIN VENTA DE BEBIDAS ALCOHOLICAS.', $license->observations);

        $this->actingAs($this->clerk)
            ->get(route('licenses.print', $license))
            ->assertSee('HORARIO HASTA LAS 23:00. SIN VENTA DE BEBIDAS ALCOHOLICAS.')
            ->assertDontSee(self::STANDARD);
    }

    public function test_without_edits_the_standard_text_is_kept_on_the_licence()
    {
        $license = $this->issue();

        $this->assertSame(self::STANDARD, $license->observations);

        // Changing the standard afterwards does not alter the issued licence.
        config(['licencias.license_observations' => 'OTRO TEXTO.']);

        $this->actingAs($this->clerk)
            ->get(route('licenses.print', $license))
            ->assertSee(self::STANDARD)
            ->assertDontSee('OTRO TEXTO.');
    }

    public function test_a_licence_without_its_own_text_prints_the_standard()
    {
        $license = $this->issue();
        $license->update(['observations' => null]); // as imported from the old system

        $this->actingAs($this->clerk)
            ->get(route('licenses.print', ['license' => $license, 'blank' => 1]))
            ->assertSee(self::STANDARD);
    }

    public function test_validity_is_still_added_automatically()
    {
        $license = $this->issue(['observations' => 'SOLO TEXTO PROPIO.', 'valid_until' => now()->addMonths(6)->toDateString()]);

        $this->actingAs($this->clerk)
            ->get(route('licenses.print', $license))
            ->assertSeeInOrder(['SOLO TEXTO PROPIO.', 'VIGENCIA HASTA EL '.$license->valid_until->format('d/m/Y').'.']);
    }

    public function test_the_text_must_fit_the_form()
    {
        $this->actingAs($this->clerk)
            ->post(route('procedures.documents.store', $this->paidProcedure()), [
                'series' => ['licencia' => '000999'],
                'observations' => str_repeat('A', License::OBSERVATIONS_MAX + 1),
            ])
            ->assertSessionHasErrors('observations');

        $this->assertSame(0, License::count());
    }

    public function test_the_text_is_edited_later_and_logged_in_the_procedure()
    {
        $license = $this->issue();

        $this->actingAs($this->clerk)
            ->from(route('licenses.show', $license))
            ->put(route('licenses.observations', $license), ['observations' => ' PROHIBIDO EL USO DE PARLANTES EXTERIORES. '])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('licenses.show', $license));

        $this->assertSame('PROHIBIDO EL USO DE PARLANTES EXTERIORES.', $license->fresh()->observations);
        $this->assertDatabaseHas('procedure_events', [
            'procedure_id' => $license->procedure_id,
            'type' => 'licencia_observaciones',
        ]);
    }

    public function test_editing_requires_text_that_fits_and_permission()
    {
        $license = $this->issue();

        $this->actingAs($this->clerk)
            ->put(route('licenses.observations', $license), ['observations' => ''])
            ->assertSessionHasErrors('observations');

        $this->actingAs($this->clerk)
            ->put(route('licenses.observations', $license), ['observations' => str_repeat('A', License::OBSERVATIONS_MAX + 1)])
            ->assertSessionHasErrors('observations');

        $cashier = User::factory()->create();
        $cashier->assignRole('Caja');

        $this->actingAs($cashier)
            ->put(route('licenses.observations', $license), ['observations' => 'CAMBIO.'])
            ->assertForbidden();

        $this->assertSame(self::STANDARD, $license->fresh()->observations);
    }

    public function test_the_licence_page_shows_the_text_to_edit()
    {
        $license = $this->issue(['observations' => 'TEXTO PROPIO.']);

        $this->actingAs($this->clerk)
            ->get(route('licenses.show', $license))
            ->assertInertia(fn (Assert $page) => $page
                ->where('license.observations', 'TEXTO PROPIO.')
                ->where('observationsMax', License::OBSERVATIONS_MAX)
                ->where('standardObservations', self::STANDARD)
            );
    }
}
