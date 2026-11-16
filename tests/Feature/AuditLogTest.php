<?php

namespace Tests\Feature;

use App\Enums\LicenseStatus;
use App\Models\Establishment;
use App\Models\License;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The audit reads as a list: who did what to which record, with the
 * changed fields in Spanish, and can be narrowed to one changed field.
 */
class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('Administrador');
    }

    private function license(): License
    {
        $establishment = Establishment::factory()->create();

        return License::create([
            'type' => 'licencia',
            'year' => 2026,
            'sequence' => 1,
            'number' => 'LF-2026-00001',
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'issued_at' => '2026-03-10',
            'status' => LicenseStatus::Active,
            'holder_name' => 'MAMANI QUISPE ANA',
            'holder_document' => 'DNI 01234567',
            'activity' => 'BODEGA',
            'address' => 'JR. LIMA 123',
        ]);
    }

    public function test_each_change_names_its_record_and_fields_in_spanish()
    {
        $this->actingAs($this->admin);
        $license = $this->license();
        $license->update(['status' => LicenseStatus::Revoked, 'status_reason' => 'Duplicada por error.']);

        $this->get(route('audit.index', ['module' => 'licenses']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('activities.data.0.event', 'updated')
                ->where('activities.data.0.event_label', 'Modificó')
                ->where('activities.data.0.module', 'Licencias')
                ->where('activities.data.0.subject', 'LF-2026-00001')
                ->where('activities.data.0.subject_url', route('licenses.show', $license))
                ->where('activities.data.0.changes.0.field', 'status')
                ->where('activities.data.0.changes.0.label', 'Estado')
                ->where('activities.data.0.changes.0.old', 'vigente')
                ->where('activities.data.0.changes.0.new', 'anulada')
                ->where('activities.data.0.changes.1.label', 'Motivo del estado')
                ->where('activities.data.1.event', 'created')
            );
    }

    public function test_it_filters_by_a_changed_field_of_the_module()
    {
        $this->actingAs($this->admin);
        $license = $this->license();
        $license->update(['status' => LicenseStatus::Revoked, 'status_reason' => 'Duplicada.']);
        $license->update(['series' => '0010234']);

        $this->get(route('audit.index', ['module' => 'licenses', 'field' => 'series']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('activities.data', 1)
                ->where('activities.data.0.changes.0.field', 'series')
                ->where('fields', fn ($fields) => collect($fields)->contains(fn ($field) => $field['value'] === 'series' && $field['label'] === 'Serie del formato'))
            );

        // The creation also set the status: both show for "Estado".
        $this->get(route('audit.index', ['module' => 'licenses', 'field' => 'status']))
            ->assertInertia(fn (Assert $page) => $page->has('activities.data', 2));
    }

    public function test_an_unknown_field_is_ignored()
    {
        $this->actingAs($this->admin);
        $this->license();

        $this->get(route('audit.index', ['module' => 'licenses', 'field' => "x') or 1=1 --"]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('activities.data', 1)
                ->where('filters.field', null)
            );
    }

    public function test_inspections_are_audited_as_their_own_module()
    {
        $this->actingAs($this->admin)
            ->get(route('audit.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('modules', fn ($modules) => collect($modules)->contains('label', 'Fiscalización'))
            );
    }
}
