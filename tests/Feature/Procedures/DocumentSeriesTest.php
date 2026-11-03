<?php

namespace Tests\Feature\Procedures;

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
use Tests\TestCase;

class DocumentSeriesTest extends TestCase
{
    use RefreshDatabase;

    private User $clerk;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->clerk = User::factory()->create();
        $this->clerk->assignRole('Mesa de partes');
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
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

    public function test_issuing_a_document_requires_its_series()
    {
        $procedure = $this->paidProcedure();

        $this->actingAs($this->clerk)
            ->post(route('procedures.documents.store', $procedure))
            ->assertSessionHasErrors('series.licencia');

        $this->assertSame(0, License::count());
    }

    public function test_the_series_is_stored_on_the_issued_document()
    {
        $procedure = $this->paidProcedure();

        $this->actingAs($this->clerk)
            ->post(route('procedures.documents.store', $procedure), ['series' => ['licencia' => '000123']])
            ->assertSessionHasNoErrors();

        $this->assertSame('000123', License::sole()->series);
    }

    public function test_a_series_cannot_be_used_twice_for_the_same_document_type()
    {
        $first = $this->paidProcedure();
        $this->actingAs($this->clerk)->post(route('procedures.documents.store', $first), ['series' => ['licencia' => '000123']]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.documents.store', $this->paidProcedure()), ['series' => ['licencia' => '000123']])
            ->assertSessionHasErrors('series.licencia');
    }
}
