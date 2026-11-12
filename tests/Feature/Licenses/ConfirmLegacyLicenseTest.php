<?php

namespace Tests\Feature\Licenses;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterProcedure;
use App\Enums\LicenseStatus;
use App\Models\Establishment;
use App\Models\License;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Licences imported from the old system rarely had their closures recorded:
 * the municipality confirms which ones are still in force.
 */
class ConfirmLegacyLicenseTest extends TestCase
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

    private function license(bool $legacy = true): License
    {
        $establishment = Establishment::factory()->create();

        return License::create([
            'type' => 'licencia',
            'year' => 2005,
            'sequence' => $legacy ? null : 1,
            'number' => $legacy ? '1234-2005' : 'LF-2026-00001',
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'issued_at' => '2005-03-10',
            'status' => LicenseStatus::Active,
            'holder_name' => 'MAMANI QUISPE ANA',
            'holder_document' => '01234567',
            'activity' => 'BODEGA',
            'address' => 'JR. LIMA 123',
        ]);
    }

    public function test_the_public_page_warns_about_an_unconfirmed_legacy_licence()
    {
        $license = $this->license();

        $this->get(route('verify', $license->qr_token))
            ->assertInertia(fn (Assert $page) => $page
                ->where('license.is_legacy', true)
                ->where('license.confirmed_at', null)
            );
    }

    public function test_fiscalizacion_confirms_a_legacy_licence_still_in_force()
    {
        $license = $this->license();
        $inspector = $this->user('Fiscalización');

        $this->actingAs($inspector)
            ->post(route('licenses.confirm', $license), ['confirmation_note' => 'Inspección de fiscalización: local en funcionamiento.'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $license->refresh();
        $this->assertNotNull($license->confirmed_at);
        $this->assertSame($inspector->id, $license->confirmed_by);
        $this->assertSame('Inspección de fiscalización: local en funcionamiento.', $license->confirmation_note);

        $this->get(route('verify', $license->qr_token))
            ->assertInertia(fn (Assert $page) => $page
                ->where('license.is_legacy', false)
                ->where('license.confirmed_at', now()->toDateString())
            );
    }

    public function test_the_confirmation_needs_its_basis()
    {
        $this->actingAs($this->user('Mesa de partes'))
            ->post(route('licenses.confirm', $this->license()), ['confirmation_note' => ''])
            ->assertSessionHasErrors('confirmation_note');
    }

    public function test_only_legacy_licences_in_force_can_be_confirmed()
    {
        $clerk = $this->user('Mesa de partes');

        $current = $this->license(legacy: false);
        $this->actingAs($clerk)->post(route('licenses.confirm', $current), ['confirmation_note' => 'Local en funcionamiento.']);
        $this->assertNull($current->fresh()->confirmed_at);

        $closed = $this->license();
        $closed->update(['status' => LicenseStatus::Closed]);
        $this->actingAs($clerk)->post(route('licenses.confirm', $closed), ['confirmation_note' => 'Local en funcionamiento.']);
        $this->assertNull($closed->fresh()->confirmed_at);
    }

    public function test_users_without_permission_cannot_confirm()
    {
        $this->actingAs($this->user('Caja'))
            ->post(route('licenses.confirm', $this->license()), ['confirmation_note' => 'Local en funcionamiento.'])
            ->assertForbidden();
    }

    public function test_the_list_filters_the_legacy_licences_pending_confirmation()
    {
        $pending = $this->license();
        $confirmed = $this->license();
        $confirmed->update(['confirmed_at' => now()]);
        $this->license(legacy: false);

        $this->actingAs($this->user('Mesa de partes'))
            ->get(route('licenses.index', ['filter' => ['confirmation' => 'pending']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('licenses.data', 1)
                ->where('licenses.data.0.id', $pending->id)
                ->where('licenses.data.0.needs_confirmation', true)
                ->where('filters.confirmation', 'pending')
            );
    }

    public function test_the_list_counts_the_licences_pending_confirmation()
    {
        $this->license();
        $this->license();
        $this->license()->update(['confirmed_at' => now()]);
        $this->license(legacy: false);

        $this->actingAs($this->user('Mesa de partes'))
            ->get(route('licenses.index'))
            ->assertInertia(fn (Assert $page) => $page->where('pending_count', 2));
    }

    public function test_several_selected_licences_are_confirmed_at_once()
    {
        $first = $this->license();
        $second = $this->license();
        $current = $this->license(legacy: false);
        $untouched = $this->license();
        $inspector = $this->user('Fiscalización');

        $this->actingAs($inspector)
            ->post(route('licenses.confirm-many'), [
                'ids' => [$first->id, $second->id, $current->id],
                'confirmation_note' => 'Operativo de fiscalización: locales en funcionamiento.',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        foreach ([$first, $second] as $license) {
            $license->refresh();
            $this->assertNotNull($license->confirmed_at);
            $this->assertSame($inspector->id, $license->confirmed_by);
            $this->assertSame('Operativo de fiscalización: locales en funcionamiento.', $license->confirmation_note);
        }

        $this->assertNull($current->fresh()->confirmed_at);
        $this->assertNull($untouched->fresh()->confirmed_at);
    }

    public function test_the_bulk_confirmation_needs_licences_and_its_basis()
    {
        $this->actingAs($this->user('Mesa de partes'))
            ->post(route('licenses.confirm-many'), ['ids' => [], 'confirmation_note' => ''])
            ->assertSessionHasErrors(['ids', 'confirmation_note']);
    }

    public function test_users_without_permission_cannot_confirm_in_bulk()
    {
        $this->actingAs($this->user('Caja'))
            ->post(route('licenses.confirm-many'), [
                'ids' => [$this->license()->id],
                'confirmation_note' => 'Local en funcionamiento.',
            ])
            ->assertForbidden();
    }

    public function test_the_licence_page_carries_its_verification_qr()
    {
        $license = $this->license();

        $this->actingAs($this->user('Mesa de partes'))
            ->get(route('licenses.show', $license))
            ->assertInertia(fn (Assert $page) => $page
                ->where('license.qr', fn (string $qr) => str_starts_with($qr, 'data:image/svg+xml'))
            );
    }

    public function test_a_procedure_on_a_legacy_licence_confirms_it()
    {
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $legacy = $this->license();
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 0, 'license_effect' => 'duplicado']);

        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $legacy->taxpayer_id,
            'establishment_id' => $legacy->establishment_id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);
        app(IssuePaymentOrder::class)->handle($procedure->load('types'));
        app(IssueDocuments::class)->handle($procedure->fresh(), [], null, $legacy);

        $legacy->refresh();
        $this->assertNotNull($legacy->confirmed_at);
        $this->assertStringContainsString($procedure->code, $legacy->confirmation_note);
    }
}
