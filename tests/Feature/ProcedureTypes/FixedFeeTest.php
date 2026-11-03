<?php

namespace Tests\Feature\ProcedureTypes;

use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterProcedure;
use App\Models\Establishment;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Some TUPA fees are a fixed amount in soles; the rest follow the UIT of the year.
 */
class FixedFeeTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->givePermissionTo('parameters.manage');

        return $user;
    }

    public function test_a_fixed_fee_ignores_the_uit()
    {
        $uit = Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);

        $fixed = ProcedureType::factory()->create(['uit_percentage' => 4.5196, 'fixed_amount' => 208.20]);
        $byUit = ProcedureType::factory()->create(['uit_percentage' => 4.5196, 'fixed_amount' => null]);

        $this->assertTrue($fixed->isFixed());
        $this->assertSame('208.20', $fixed->feeFor($uit));
        $this->assertFalse($byUit->isFixed());
        $this->assertSame('248.58', $byUit->feeFor($uit));
    }

    public function test_a_procedure_type_can_be_saved_with_a_fixed_amount_and_back_to_uit()
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->post(route('procedure-types.store'), ['name' => 'AUTORIZACION PARA VOLANTEO', 'fixed_amount' => '45.60'])
            ->assertSessionHasNoErrors();

        $type = ProcedureType::query()->sole();
        $this->assertSame('45.60', $type->fixed_amount);
        $this->assertSame('0.0000', $type->uit_percentage);

        $this->actingAs($admin)
            ->put(route('procedure-types.update', $type), ['name' => $type->name, 'uit_percentage' => '0.8804', 'fixed_amount' => ''])
            ->assertSessionHasNoErrors();

        $type->refresh();
        $this->assertNull($type->fixed_amount);
        $this->assertSame('0.8804', $type->uit_percentage);
    }

    public function test_a_fee_needs_either_a_uit_percentage_or_a_fixed_amount()
    {
        $this->actingAs($this->admin())
            ->post(route('procedure-types.store'), ['name' => 'SIN MONTO'])
            ->assertSessionHasErrors('uit_percentage');
    }

    public function test_the_payment_order_freezes_a_fixed_fee_without_uit_percentage()
    {
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 4.5196, 'fixed_amount' => 208.20]);

        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);

        $order = app(IssuePaymentOrder::class)->handle($procedure->load('types'));

        $this->assertSame('208.20', $order->total);
        $this->assertNull($order->items->first()->uit_percentage);
        $this->assertSame('208.20', $order->items->first()->amount);
    }

    public function test_the_procedure_wizard_offers_the_fixed_fee()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 4.5196, 'fixed_amount' => 208.20]);

        $this->actingAs($clerk)
            ->get(route('procedures.create'))
            ->assertInertia(fn (Assert $page) => $page->where('procedureTypes.0.fee', '208.20'));
    }
}
