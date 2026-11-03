<?php

namespace Tests\Feature\Licenses;

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
use Tests\TestCase;

/**
 * The series is typed from the pre-printed form when issuing: a typo can be
 * corrected afterwards, leaving a trace in the procedure history.
 */
class CorrectLicenseSeriesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function user(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function issueLicense(string $series): License
    {
        Uit::query()->firstOrCreate(['year' => now()->year], ['amount' => 5500]);
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

        return app(IssueDocuments::class)->handle($procedure->fresh(), [], null, null, ['licencia' => $series])->first();
    }

    public function test_a_mistyped_series_is_corrected_and_logged_in_the_procedure()
    {
        $license = $this->issueLicense('4324234234234');

        $this->actingAs($this->user('Mesa de partes'))
            ->from(route('licenses.show', $license))
            ->put(route('licenses.series', $license), ['series' => ' 0010234 '])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('licenses.show', $license));

        $this->assertSame('0010234', $license->fresh()->series);
        $this->assertDatabaseHas('procedure_events', [
            'procedure_id' => $license->procedure_id,
            'type' => 'licencia_serie',
            'description' => "{$license->number}: serie 4324234234234 → 0010234.",
        ]);
    }

    public function test_the_series_is_required_and_unique_among_licences()
    {
        $taken = $this->issueLicense('0010234');
        $license = $this->issueLicense('0010299');
        $clerk = $this->user('Mesa de partes');

        $this->actingAs($clerk)
            ->put(route('licenses.series', $license), ['series' => ''])
            ->assertSessionHasErrors('series');

        $this->actingAs($clerk)
            ->put(route('licenses.series', $license), ['series' => $taken->series])
            ->assertSessionHasErrors(['series' => 'El campo serie ya ha sido registrado.']);

        // Saving its own series again is not a clash.
        $this->actingAs($clerk)
            ->put(route('licenses.series', $license), ['series' => '0010299'])
            ->assertSessionHasNoErrors();

        $this->assertSame('0010299', $license->fresh()->series);
    }

    public function test_only_staff_who_manage_procedures_correct_the_series()
    {
        $license = $this->issueLicense('0010234');

        $this->actingAs($this->user('Caja'))
            ->put(route('licenses.series', $license), ['series' => '0010235'])
            ->assertForbidden();

        $this->assertSame('0010234', $license->fresh()->series);
    }
}
