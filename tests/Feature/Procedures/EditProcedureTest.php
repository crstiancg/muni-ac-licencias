<?php

namespace Tests\Feature\Procedures;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Models\Establishment;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Each procedure keeps the applicant and the establishment as declared in
 * its sworn declaration. Correcting them there changes only that procedure
 * (its DJ, payment order and licence), never the taxpayer's record or its
 * other procedures. It can be edited until it is paid and its signed DJ
 * received by Mesa de partes; the procedure types only before liquidating.
 */
class EditProcedureTest extends TestCase
{
    use RefreshDatabase;

    private User $clerk;

    private Establishment $establishment;

    private ProcedureType $type;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->clerk = User::factory()->create();
        $this->clerk->assignRole('Mesa de partes');
        $this->clerk->givePermissionTo('payments.collect');

        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $this->establishment = Establishment::factory()->create(['activity' => 'BODEGA', 'street' => 'LIMA', 'number' => '123']);
        $this->establishment->taxpayer->update(['name' => 'QUISPE MAMANY ANA', 'address' => 'JR. LIMA']);
        $this->type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']);
    }

    private function register(): Procedure
    {
        return app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$this->type->id],
            'taxpayer_id' => $this->establishment->taxpayer_id,
            'establishment_id' => $this->establishment->id,
            'declaration' => ['length' => 10, 'width' => 5, 'flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);
    }

    /**
     * What the edit form sends back: every field, some corrected.
     *
     * @return array<string, mixed>
     */
    private function corrected(Procedure $procedure, array $applicant = [], array $premises = [], array $declaration = []): array
    {
        return [
            'applicant' => [...$procedure->applicant_data, ...$applicant],
            'premises' => [...$procedure->premises_data, ...$premises],
            'declaration' => [...$procedure->declaration, ...$declaration],
        ];
    }

    public function test_registering_freezes_the_applicant_and_establishment_in_the_procedure()
    {
        $procedure = $this->register();

        $this->assertSame('QUISPE MAMANY ANA', $procedure->applicant_data['name']);
        $this->assertSame('dni', $procedure->applicant_data['document_type']);
        $this->assertSame('BODEGA', $procedure->premises_data['activity']);
        $this->assertSame('123', $procedure->premises_data['number']);
    }

    public function test_the_edit_form_brings_every_field()
    {
        $procedure = $this->register();

        $this->actingAs($this->clerk)
            ->get(route('procedures.edit', $procedure))
            ->assertInertia(fn (Assert $page) => $page
                ->component('procedures/edit')
                ->where('procedure.applicant.name', 'QUISPE MAMANY ANA')
                ->where('procedure.applicant.address', 'JR. LIMA')
                ->has('procedure.applicant.settlement')
                ->where('procedure.premises.activity', 'BODEGA')
                ->where('procedure.premises.street', 'LIMA')
                ->where('procedure.declaration.length', 10)
                ->where('procedure.type_ids', [$this->type->id])
                ->where('canChangeTypes', true)
                ->has('procedureTypes')
                ->has('documentTypes')
                ->has('establishmentOptions.streetTypes')
            );
    }

    public function test_corrections_stay_in_this_procedure()
    {
        $procedure = $this->register();
        $other = $this->register();

        $this->actingAs($this->clerk)
            ->put(route('procedures.update', $procedure), [
                'procedure_type_ids' => [$this->type->id],
                ...$this->corrected(
                    $procedure,
                    applicant: ['name' => 'QUISPE MAMANI ANA', 'number' => '456', 'lot' => '7'],
                    premises: ['activity' => 'BODEGA Y LIBRERIA', 'interior' => 'B'],
                    declaration: ['length' => 12],
                ),
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('procedures.show', $procedure));

        $procedure->refresh();
        $this->assertSame('QUISPE MAMANI ANA', $procedure->applicant_data['name']);
        $this->assertSame('456', $procedure->applicant_data['number']);
        $this->assertSame('BODEGA Y LIBRERIA', $procedure->premises_data['activity']);
        $this->assertEquals(12, $procedure->declaration['length']);

        // Neither the taxpayer's record nor its other procedure change.
        $this->assertSame('QUISPE MAMANY ANA', $this->establishment->taxpayer->fresh()->name);
        $this->assertSame('BODEGA', $this->establishment->fresh()->activity);
        $this->assertSame('QUISPE MAMANY ANA', $other->fresh()->applicant_data['name']);

        $this->get(route('procedures.declaration.print', $procedure))
            ->assertSee('QUISPE MAMANI ANA')
            ->assertSee('BODEGA Y LIBRERIA')
            ->assertSeeInOrder(['>JR. LIMA</td>', '>456</td>'], false);

        $this->get(route('procedures.declaration.print', $other))
            ->assertSee('QUISPE MAMANY ANA')
            ->assertDontSee('BODEGA Y LIBRERIA');
    }

    public function test_the_payment_order_and_the_licence_take_the_corrected_data()
    {
        $procedure = $this->register();

        $this->actingAs($this->clerk)->put(route('procedures.update', $procedure), [
            'procedure_type_ids' => [$this->type->id],
            ...$this->corrected($procedure, applicant: ['name' => 'QUISPE MAMANI ANA'], premises: ['trade_name' => 'BODEGA ANITA']),
        ])->assertSessionHasNoErrors();

        $order = app(IssuePaymentOrder::class)->handle($procedure->fresh());
        $this->assertSame('QUISPE MAMANI ANA', $order->payer_name);

        app(RegisterPayment::class)->handle($order, '44025', now()->toDateString());
        $license = app(IssueDocuments::class)->handle($procedure->fresh())->first();

        $this->assertSame('QUISPE MAMANI ANA', $license->holder_name);
        $this->assertSame('BODEGA ANITA', $license->trade_name);
        $this->assertSame($this->establishment->taxpayer_id, $license->taxpayer_id);
    }

    public function test_it_stays_editable_until_paid_and_received_and_the_types_until_liquidated()
    {
        $procedure = $this->register();
        $order = app(IssuePaymentOrder::class)->handle($procedure);

        // Liquidated: everything but the types.
        $this->actingAs($this->clerk)
            ->get(route('procedures.edit', $procedure))
            ->assertInertia(fn (Assert $page) => $page->where('canChangeTypes', false));

        $other = ProcedureType::factory()->create(['is_active' => true]);
        $this->put(route('procedures.update', $procedure), [
            'procedure_type_ids' => [$other->id],
            ...$this->corrected($procedure->fresh()),
        ])->assertSessionHasErrors('procedure_type_ids');

        $this->put(route('procedures.update', $procedure), $this->corrected($procedure->fresh(), applicant: ['phone' => '951000111']))
            ->assertSessionHasNoErrors();
        $this->assertSame([$this->type->id], $procedure->types()->pluck('procedure_types.id')->all());

        // Paid but the signed DJ not received yet: still editable.
        app(RegisterPayment::class)->handle($order, '44025', now()->toDateString());
        $this->put(route('procedures.update', $procedure), $this->corrected($procedure->fresh(), applicant: ['phone' => '951000222']))
            ->assertSessionHasNoErrors();
        $this->assertSame('951000222', $procedure->fresh()->applicant_data['phone']);

        // Paid and received: closed.
        $this->put(route('procedures.reception', $procedure), ['file_number' => '12345']);
        $this->get(route('procedures.edit', $procedure))->assertRedirect(route('procedures.show', $procedure));
        $this->put(route('procedures.update', $procedure), $this->corrected($procedure->fresh(), applicant: ['phone' => '951000333']))
            ->assertRedirect(route('procedures.show', $procedure));
        $this->assertSame('951000222', $procedure->fresh()->applicant_data['phone']);

        $this->get(route('procedures.show', $procedure))
            ->assertInertia(fn (Assert $page) => $page->where('procedure.is_editable', false));
    }

    public function test_received_but_not_paid_is_still_editable()
    {
        $procedure = $this->register();
        $this->actingAs($this->clerk)->put(route('procedures.reception', $procedure), ['file_number' => '12345']);

        $this->get(route('procedures.show', $procedure))
            ->assertInertia(fn (Assert $page) => $page->where('procedure.is_editable', true));
        $this->get(route('procedures.edit', $procedure))->assertOk();
    }

    public function test_procedures_registered_before_get_their_copy()
    {
        $procedure = $this->register();
        $procedure->update(['applicant_data' => null, 'premises_data' => null]);

        (require database_path('migrations/2026_11_21_120000_add_declared_parties_to_procedures_table.php'))->backfill();

        $procedure->refresh();
        $this->assertSame('QUISPE MAMANY ANA', $procedure->applicant_data['name']);
        $this->assertSame('BODEGA', $procedure->premises_data['activity']);
    }
}
