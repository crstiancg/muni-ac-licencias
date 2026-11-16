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
}
