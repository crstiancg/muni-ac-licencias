<?php

namespace Tests\Feature\Inspections;

use App\Enums\LicenseStatus;
use App\Models\Establishment;
use App\Models\Inspection;
use App\Models\License;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Inspectors check businesses in the field from their phone: they find the
 * licence (issued here or imported from the old system), compare it with
 * what they see and record the visit, also when there is no licence.
 */
class InspectionTest extends TestCase
{
    use RefreshDatabase;

    private User $inspector;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->inspector = User::factory()->create();
        $this->inspector->assignRole('Fiscalización');
        Storage::fake(config('licencias.inspection_disk'));
    }

    private function license(array $attributes = []): License
    {
        $establishment = Establishment::factory()->create();

        return License::create([
            'type' => 'licencia',
            'year' => 2026,
            'sequence' => 1,
            'number' => 'LF-2026-00001',
            'series' => '0010234',
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'issued_at' => '2026-03-10',
            'status' => LicenseStatus::Active,
            'holder_name' => 'MAMANI QUISPE ANA',
            'holder_document' => 'RUC 10012345671',
            'trade_name' => 'BODEGA ANITA',
            'activity' => 'BODEGA',
            'address' => 'JR. LIMA 123',
            ...$attributes,
        ]);
    }

    private function legacyLicense(): License
    {
        return $this->license([
            'year' => 2005,
            'sequence' => null,
            'number' => '1234-2005',
            'series' => null,
            'holder_name' => 'CONDORI APAZA LUIS',
            'holder_document' => 'DNI 01234567',
            'trade_name' => 'RESTAURANTE EL LAGO',
            'activity' => 'RESTAURANTE',
            'address' => 'AV. EL SOL 456',
            'legacy_id' => 777,
        ]);
    }

    private function checks(bool $ok = true): array
    {
        return [
            'holder_matches' => true,
            'activity_matches' => $ok,
            'address_matches' => true,
            'license_displayed' => true,
        ];
    }

    public function test_only_inspectors_open_the_module()
    {
        $this->actingAs($this->inspector)->get(route('inspections.index'))->assertOk();

        $cashier = User::factory()->create();
        $cashier->assignRole('Caja');

        $this->actingAs($cashier)->get(route('inspections.index'))->assertForbidden();
    }

    public function test_it_finds_licences_issued_here_and_imported_ones()
    {
        $issued = $this->license();
        $legacy = $this->legacyLicense();

        foreach (['10012345671', 'anita', 'jr. lima', 'LF-2026-00001', '0010234'] as $term) {
            $this->actingAs($this->inspector)
                ->get(route('inspections.index', ['search' => $term]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('results.0.id', $issued->id)
                    ->where('results.0.status', 'vigente')
                );
        }

        foreach (['01234567', 'el lago', 'el sol', '1234-2005'] as $term) {
            $this->actingAs($this->inspector)
                ->get(route('inspections.index', ['search' => $term]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('results.0.id', $legacy->id)
                    ->where('results.0.is_legacy', true)
                );
        }
    }

    public function test_scanning_the_qr_opens_the_visit_form_of_that_licence()
    {
        $license = $this->license();

        $this->actingAs($this->inspector)
            ->get(route('inspections.scan', ['code' => $license->verificationUrl()]))
            ->assertRedirect(route('inspections.create', ['license' => $license->id]));

        $this->actingAs($this->inspector)
            ->get(route('inspections.scan', ['code' => 'https://otro.sitio/v/NOEXISTE1']))
            ->assertRedirect(route('inspections.index'))
            ->assertInertiaFlash('toast.type', 'error');
    }

    public function test_the_visit_form_shows_what_to_compare_on_site()
    {
        $license = $this->legacyLicense();
        $license->update(['status' => LicenseStatus::Revoked]);

        $this->actingAs($this->inspector)
            ->get(route('inspections.create', ['license' => $license->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('inspections/create')
                ->where('license.holder_name', 'CONDORI APAZA LUIS')
                ->where('license.activity', 'RESTAURANTE')
                ->where('license.address', 'AV. EL SOL 456')
                ->where('license.status', 'anulada')
                ->where('license.is_legacy', true)
                ->has('license.itse')
                ->has('results')
            );
    }

    public function test_a_visit_to_a_licensed_business_is_recorded_with_photos_and_location()
    {
        $license = $this->license();

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $license->id,
                'result' => 'conforme',
                'checks' => $this->checks(),
                'notes' => 'Todo en orden.',
                'latitude' => '-15.8402218',
                'longitude' => '-70.0219010',
                'gps_accuracy' => 12,
                'photos' => [UploadedFile::fake()->image('fachada.jpg'), UploadedFile::fake()->image('licencia.jpg')],
            ])
            ->assertSessionHasNoErrors();

        $inspection = Inspection::sole();

        $this->assertSame('FIS-'.now()->year.'-00001', $inspection->code);
        $this->assertSame($license->establishment_id, $inspection->establishment_id);
        $this->assertSame($this->inspector->id, $inspection->inspector_id);
        // What the licence said at the time of the visit.
        $this->assertSame('vigente', $inspection->license_status);
        $this->assertTrue($inspection->checks['activity_matches']);
        $this->assertSame('-15.8402218', $inspection->latitude);
        $this->assertCount(2, $inspection->photos);
        Storage::disk(config('licencias.inspection_disk'))->assertExists($inspection->photos[0]->path);
    }

    public function test_conforme_is_refused_when_something_does_not_match()
    {
        $license = $this->license();

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $license->id,
                'result' => 'conforme',
                'checks' => $this->checks(ok: false),
            ])
            ->assertSessionHasErrors('result');

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $license->id,
                'result' => 'observado',
                'checks' => $this->checks(ok: false),
                'notes' => 'Funciona como licorería, no como bodega.',
            ])
            ->assertSessionHasNoErrors();
    }

    public function test_licencia_no_vigente_only_for_a_licence_not_in_force()
    {
        $valid = $this->license();

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $valid->id,
                'result' => 'licencia_no_vigente',
                'checks' => $this->checks(ok: false),
            ])
            ->assertSessionHasErrors(['result' => 'La licencia está vigente: si algo no coincide, elige "Con observaciones".']);

        $revoked = $this->license(['number' => 'LF-2026-00002', 'sequence' => 2, 'series' => null, 'status' => LicenseStatus::Revoked]);

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $revoked->id,
                'result' => 'licencia_no_vigente',
                'checks' => $this->checks(),
            ])
            ->assertSessionHasNoErrors();
    }

    public function test_conforme_only_for_a_licence_in_force()
    {
        $expired = $this->license(['valid_until' => now()->subDay()->toDateString()]);

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $expired->id,
                'result' => 'conforme',
                'checks' => $this->checks(),
            ])
            ->assertSessionHasErrors(['result' => 'La licencia no está vigente (Caducada): elige "Licencia no vigente".']);
    }

    public function test_the_form_disables_results_that_contradict_the_licence()
    {
        $valid = $this->license();

        $this->actingAs($this->inspector)
            ->get(route('inspections.create', ['license' => $valid->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('results', fn ($results) => collect($results)->firstWhere('value', 'licencia_no_vigente')['disabled'] === 'Esta licencia está vigente.'
                    && collect($results)->firstWhere('value', 'conforme')['disabled'] === null)
            );
    }

    public function test_the_visit_confirms_an_imported_licence_still_in_force()
    {
        $legacy = $this->legacyLicense();
        $this->assertTrue($legacy->needsConfirmation());

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $legacy->id,
                'result' => 'conforme',
                'checks' => $this->checks(),
                'confirm_license' => true,
            ])
            ->assertSessionHasNoErrors();

        $inspection = Inspection::sole();
        $legacy->refresh();

        $this->assertTrue($inspection->confirmed_license);
        $this->assertFalse($legacy->needsConfirmation());
        $this->assertSame($this->inspector->id, $legacy->confirmed_by);
        $this->assertSame("Fiscalización {$inspection->code}: Conforme.", $legacy->confirmation_note);

        $this->actingAs($this->inspector)
            ->get(route('inspections.show', $inspection))
            ->assertInertia(fn (Assert $page) => $page->where('inspection.confirmed_license', true));
    }

    public function test_only_an_operating_business_with_a_licence_to_confirm_confirms_it()
    {
        $legacy = $this->legacyLicense();

        // Closed: nobody saw it working.
        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $legacy->id,
                'result' => 'cerrado',
                'confirm_license' => true,
            ])
            ->assertSessionHasErrors(['confirm_license' => 'Solo se confirma la vigencia si el negocio está funcionando (Conforme o Con observaciones).']);

        // Issued here: there is nothing to confirm.
        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $this->license()->id,
                'result' => 'conforme',
                'checks' => $this->checks(),
                'confirm_license' => true,
            ])
            ->assertSessionHasErrors(['confirm_license' => 'Esta licencia no requiere confirmación.']);

        $this->assertNull($legacy->fresh()->confirmed_at);
        $this->assertSame(0, Inspection::count());
    }

    public function test_the_visit_form_offers_to_confirm_and_the_home_counts_pending_ones()
    {
        $legacy = $this->legacyLicense();

        $this->actingAs($this->inspector)
            ->get(route('inspections.create', ['license' => $legacy->id]))
            ->assertInertia(fn (Assert $page) => $page->where('license.needs_confirmation', true));

        $this->actingAs($this->inspector)
            ->get(route('inspections.index'))
            ->assertInertia(fn (Assert $page) => $page->where('counts.pending_confirmation', 1));
    }

    public function test_a_closed_business_is_recorded_without_comparing()
    {
        $license = $this->license();

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), ['license_id' => $license->id, 'result' => 'observado'])
            ->assertSessionHasErrors('checks');

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), ['license_id' => $license->id, 'result' => 'cerrado', 'notes' => 'Cortina cerrada a las 11:00.'])
            ->assertSessionHasNoErrors();

        $this->assertNull(Inspection::sole()->checks);
    }

    public function test_a_business_without_licence_is_recorded_for_follow_up()
    {
        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'result' => 'sin_licencia',
                'business_name' => 'pollería la brasa',
                'holder_name' => 'quispe ramos juan',
                'holder_document' => '45678912',
                'address' => 'jr. moquegua 789',
                'activity' => 'pollería',
                'notes' => 'Atiende al público sin licencia.',
            ])
            ->assertSessionHasNoErrors();

        $inspection = Inspection::sole();

        $this->assertNull($inspection->license_id);
        $this->assertSame('POLLERÍA LA BRASA', $inspection->business_name);
        $this->assertSame('JR. MOQUEGUA 789', $inspection->address);

        $this->actingAs($this->inspector)
            ->get(route('inspections.index', ['filter' => ['result' => 'sin_licencia']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('inspections.data', 1)
                ->where('inspections.data.0.business_name', 'POLLERÍA LA BRASA')
            );
    }

    public function test_a_visit_without_licence_needs_the_business_name_and_address()
    {
        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), ['result' => 'sin_licencia'])
            ->assertSessionHasErrors(['business_name', 'address']);

        // "Conforme" makes no sense without a licence.
        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), ['result' => 'conforme', 'business_name' => 'X', 'address' => 'Y'])
            ->assertSessionHasErrors('result');
    }

    public function test_photos_must_be_images_and_at_most_five()
    {
        $license = $this->license();

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $license->id,
                'result' => 'observado',
                'checks' => $this->checks(),
                'photos' => [UploadedFile::fake()->create('acta.pdf', 100, 'application/pdf')],
            ])
            ->assertSessionHasErrors('photos.0');

        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'license_id' => $license->id,
                'result' => 'observado',
                'checks' => $this->checks(),
                'photos' => array_map(fn ($i) => UploadedFile::fake()->image("f{$i}.jpg"), range(1, 6)),
            ])
            ->assertSessionHasErrors('photos');
    }

    public function test_the_visit_is_seen_with_its_photos_and_on_the_licence()
    {
        $license = $this->license();
        $this->actingAs($this->inspector)->post(route('inspections.store'), [
            'license_id' => $license->id,
            'result' => 'conforme',
            'checks' => $this->checks(),
            'photos' => [UploadedFile::fake()->image('fachada.jpg')],
        ]);
        $inspection = Inspection::sole();

        $this->actingAs($this->inspector)
            ->get(route('inspections.show', $inspection))
            ->assertInertia(fn (Assert $page) => $page
                ->component('inspections/show')
                ->where('inspection.code', $inspection->code)
                ->where('inspection.result_label', 'Conforme')
                ->has('inspection.photos', 1)
            );

        $this->actingAs($this->inspector)
            ->get(route('inspections.photo', $inspection->photos[0]))
            ->assertOk();

        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');

        $this->actingAs($clerk)->get(route('inspections.photo', $inspection->photos[0]))->assertForbidden();

        // Whoever looks up the licence sees it was inspected.
        $this->actingAs($clerk)
            ->get(route('licenses.show', $license))
            ->assertInertia(fn (Assert $page) => $page
                ->where('inspections.0.code', $inspection->code)
                ->where('inspections.0.result_label', 'Conforme')
            );
    }

    private function visit(?License $license, array $attributes = []): Inspection
    {
        return Inspection::create([
            'year' => 2026,
            'sequence' => 7,
            'code' => 'FIS-2026-00007',
            'license_id' => $license?->id,
            'establishment_id' => $license?->establishment_id,
            'inspector_id' => $this->inspector->id,
            'visited_at' => '2026-11-16 10:30:00',
            'result' => 'observado',
            'license_status' => $license?->effectiveStatus()->value,
            'checks' => $license ? $this->checks(false) : null,
            'notes' => 'Amplió el giro a venta de licores.',
            'latitude' => '-15.8402218',
            'longitude' => '-70.0219107',
            'gps_accuracy' => 12,
            ...$attributes,
        ]);
    }

    public function test_the_visit_prints_as_an_inspection_act()
    {
        $inspection = $this->visit($this->license());
        $photo = $inspection->photos()->create(['path' => 'inspections/2026/foto.jpg']);

        $this->actingAs($this->inspector)
            ->get(route('inspections.print', $inspection))
            ->assertOk()
            ->assertSeeInOrder([
                'Acta de fiscalización',
                'FIS-2026-00007',
                '16/11/2026 10:30',
                'BODEGA ANITA',
                'MAMANI QUISPE ANA',
                'LF-2026-00001',
                'Vigente',
                '-15.8402218, -70.0219107 (±12 m)',
                'Con observaciones',
                'El giro coincide',
                'No',
                'Amplió el giro a venta de licores.',
                route('inspections.photo', $photo),
                $this->inspector->name,
                'Conductor o representante',
            ]);
    }

    public function test_a_business_without_licence_prints_as_seen_on_site()
    {
        $inspection = $this->visit(null, [
            'result' => 'sin_licencia',
            'business_name' => 'FERRETERIA EL MARTILLO',
            'holder_name' => 'QUISPE ROJAS JUAN',
            'holder_document' => '10456789012',
            'address' => 'JR. MOQUEGUA 789',
            'activity' => 'FERRETERIA',
            'latitude' => null,
            'longitude' => null,
            'gps_accuracy' => null,
        ]);

        $this->actingAs($this->inspector)
            ->get(route('inspections.print', $inspection))
            ->assertOk()
            ->assertSeeInOrder(['FERRETERIA EL MARTILLO', 'QUISPE ROJAS JUAN', '10456789012', 'JR. MOQUEGUA 789', 'FERRETERIA', 'Sin licencia'])
            ->assertSee('Sin licencia de funcionamiento')
            ->assertDontSee('Verificación')
            ->assertDontSee('Registro fotográfico');
    }

    public function test_the_act_states_the_imported_licence_was_confirmed()
    {
        $inspection = $this->visit($this->legacyLicense(), ['result' => 'conforme', 'checks' => $this->checks(), 'confirmed_license' => true]);

        $this->actingAs($this->inspector)
            ->get(route('inspections.print', $inspection))
            ->assertSee('se confirmó la vigencia de la licencia');

        $cashier = User::factory()->create();
        $cashier->assignRole('Caja');

        $this->actingAs($cashier)->get(route('inspections.print', $inspection))->assertForbidden();
    }

    public function test_the_visit_detail_links_to_its_act()
    {
        $inspection = $this->visit($this->license());

        $this->actingAs($this->inspector)
            ->get(route('inspections.show', $inspection))
            ->assertInertia(fn (Assert $page) => $page->where('inspection.print_url', route('inspections.print', $inspection)));
    }
}
