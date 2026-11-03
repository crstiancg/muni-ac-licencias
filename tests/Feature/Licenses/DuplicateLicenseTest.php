<?php

namespace Tests\Feature\Licenses;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Enums\LicenseStatus;
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

    private function paid(ProcedureType $type, ?Establishment $establishment = null): Procedure
    {
        $establishment ??= $this->establishment;

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

    private function issue(ProcedureType $type, string $series, ?License $related = null, ?Establishment $establishment = null): License
    {
        return app(IssueDocuments::class)->handle($this->paid($type, $establishment), [], null, $related, ['licencia' => $series])->first();
    }

    private function licenceType(): ProcedureType
    {
        return ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']);
    }

    public function test_the_procedure_already_knows_the_licence_of_its_establishment()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');

        $own = $this->issue($this->licenceType(), '0010234');
        // Another place of the same taxpayer: never the one acted on.
        $this->issue($this->licenceType(), '0010235', null, Establishment::factory()->create(['taxpayer_id' => $this->establishment->taxpayer_id]));
        $duplicate = $this->paid($this->duplicateType());
        $plain = $this->paid($this->licenceType());

        $this->actingAs($clerk)
            ->get(route('procedures.show', $duplicate))
            ->assertInertia(fn (Assert $page) => $page
                ->where('procedure.establishment_license.id', $own->id)
                ->where('procedure.establishment_license.number', $own->number)
                ->where('procedure.establishment_license.series', '0010234')
            );

        // Without an effect on a licence there is nothing to look up.
        $this->actingAs($clerk)
            ->get(route('procedures.show', $plain))
            ->assertInertia(fn (Assert $page) => $page->where('procedure.establishment_license', null));
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
