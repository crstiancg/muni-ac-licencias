<?php

namespace Tests\Feature\Licenses;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Enums\LicenseStatus;
use App\Models\Establishment;
use App\Models\License;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A duplicate is printed on a new pre-printed form as a new licence: the
 * previous one is taken out of use so the lost paper no longer verifies.
 */
class DuplicateLicenseTest extends TestCase
{
    use RefreshDatabase;

    private Establishment $establishment;

    protected function setUp(): void
    {
        parent::setUp();

        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $this->establishment = Establishment::factory()->create();
    }

    private function issue(ProcedureType $type, string $series, ?License $related = null): License
    {
        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $this->establishment->taxpayer_id,
            'establishment_id' => $this->establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);

        $order = app(IssuePaymentOrder::class)->handle($procedure->load('types'));
        app(RegisterPayment::class)->handle($order, '44025', now()->toDateString());

        return app(IssueDocuments::class)->handle($procedure->fresh(), [], null, $related, ['licencia' => $series])->first();
    }

    private function duplicateType(): ProcedureType
    {
        return ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 0.45, 'document_type' => 'licencia', 'license_effect' => 'duplicado']);
    }

    public function test_a_duplicate_issues_a_new_licence_and_replaces_the_previous_one()
    {
        $original = $this->issue(ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']), '0010234');

        $duplicate = $this->issue($this->duplicateType(), '0010999', $original);

        $this->assertNotSame($original->number, $duplicate->number);
        $this->assertSame('0010999', $duplicate->series);
        $this->assertSame(LicenseStatus::Active, $duplicate->status);
        $this->assertSame(1, $duplicate->duplicates);

        $original->refresh();
        $this->assertSame(LicenseStatus::Replaced, $original->status);
        $this->assertSame($duplicate->id, $original->replaced_by_id);
        $this->assertSame(0, $original->duplicates);
        $this->assertStringContainsString('duplicado', $original->status_reason);
        $this->assertStringContainsString($duplicate->number, $original->status_reason);
        $this->assertDatabaseHas('procedure_events', [
            'procedure_id' => $duplicate->procedure_id,
            'type' => 'licencia_duplicado',
            'description' => "{$original->number}: duplicado N° 1 emitido como {$duplicate->number}.",
        ]);
    }

    public function test_each_further_duplicate_carries_its_count_onto_the_printed_licence()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');

        $original = $this->issue(ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']), '0010234');
        $first = $this->issue($this->duplicateType(), '0010999', $original);
        $second = $this->issue($this->duplicateType(), '0011000', $first);

        $this->assertSame(2, $second->duplicates);
        $this->assertSame(LicenseStatus::Replaced, $first->fresh()->status);

        $this->actingAs($clerk)
            ->get(route('licenses.print', [$second, 'blank' => 1]))
            ->assertOk()
            ->assertSee('DUPLICADO N° 2.');
    }
}
