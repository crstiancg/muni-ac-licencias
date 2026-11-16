<?php

namespace Tests\Feature\Inspections;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Enums\DocumentType;
use App\Models\Establishment;
use App\Models\Inspection;
use App\Models\InspectionCase;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * A business found working without a licence opens a follow-up case: it is
 * notified with a deadline to get one, revisited, and closed when the
 * licence is issued to that RUC/DNI, or by hand (regularized or sent to
 * sanction).
 */
class InspectionCaseTest extends TestCase
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

    private function visitWithoutLicense(array $data = []): void
    {
        $this->actingAs($this->inspector)
            ->post(route('inspections.store'), [
                'result' => 'sin_licencia',
                'business_name' => 'ferreteria el martillo',
                'holder_name' => 'quispe rojas juan',
                'holder_document' => '45678912',
                'address' => 'jr. moquegua 789',
                'activity' => 'ferreteria',
                ...$data,
            ])
            ->assertSessionHasNoErrors();
    }

    private function openCase(): InspectionCase
    {
        $this->visitWithoutLicense();

        return InspectionCase::sole();
    }

    private function issueLicenseTo(Taxpayer $taxpayer): void
    {
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $establishment = Establishment::factory()->create(['taxpayer_id' => $taxpayer->id]);
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']);

        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $taxpayer->id,
            'establishment_id' => $establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);

        $order = app(IssuePaymentOrder::class)->handle($procedure->load('types'));
        app(RegisterPayment::class)->handle($order, '44025', now()->toDateString());
        app(IssueDocuments::class)->handle($procedure->fresh());
    }

    public function test_a_business_without_licence_opens_a_case()
    {
        $case = $this->openCase();

        $this->assertSame('SEG-'.now()->year.'-00001', $case->code);
        $this->assertSame('pendiente', $case->status->value);
        $this->assertSame('FERRETERIA EL MARTILLO', $case->business_name);
        $this->assertSame('45678912', $case->holder_document);
        $this->assertSame($this->inspector->id, $case->opened_by);
        $this->assertSame($case->id, $case->inspections()->sole()->inspection_case_id);

        $this->get(route('inspections.show', $case->inspections()->sole()))
            ->assertInertia(fn (Assert $page) => $page
                ->where('inspection.case.code', $case->code)
                ->where('inspection.case.status_label', 'Pendiente de notificar')
            );
    }

    public function test_visits_to_the_same_business_join_its_open_case()
    {
        $case = $this->openCase();

        // Same DNI, given again on another visit (or as the RUC 10 that holds it).
        $this->visitWithoutLicense(['business_name' => 'el martillo', 'holder_document' => '10456789125']);
        // Revisit started from the case page.
        $this->visitWithoutLicense(['inspection_case_id' => $case->id, 'holder_document' => null]);
        // Closed on the revisit: still part of the case.
        $this->visitWithoutLicense(['inspection_case_id' => $case->id, 'result' => 'cerrado']);

        $this->assertSame(1, InspectionCase::count());
        $this->assertSame(4, $case->inspections()->count());

        // A closed business with no case behind it opens none.
        $this->visitWithoutLicense(['result' => 'cerrado', 'holder_document' => '87654321']);
        $this->assertSame(1, InspectionCase::count());
    }

    public function test_the_revisit_form_comes_filled_with_the_case()
    {
        $case = $this->openCase();

        $this->get(route('inspections.create', ['case' => $case->id]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('inspections/create')
                ->where('case.id', $case->id)
                ->where('case.business_name', 'FERRETERIA EL MARTILLO')
                ->where('case.holder_document', '45678912')
            );

        $case->update(['status' => 'derivado']);

        $this->post(route('inspections.store'), [
            'result' => 'sin_licencia',
            'inspection_case_id' => $case->id,
            'business_name' => 'X',
            'address' => 'Y',
        ])->assertSessionHasErrors(['inspection_case_id' => 'Este caso ya está cerrado.']);
    }

    public function test_the_case_is_notified_with_a_deadline_and_shows_when_it_expires()
    {
        $this->travelTo('2026-11-02 09:00');
        $case = $this->openCase();

        $this->post(route('inspections.cases.notify', $case), [
            'notice_number' => '0123-2026',
            'notified_at' => '2026-11-02',
            'days' => 10,
        ])->assertRedirect();

        $case->refresh();
        $this->assertSame('notificado', $case->status->value);
        $this->assertSame('0123-2026', $case->notice_number);
        $this->assertSame('2026-11-12', $case->deadline->toDateString());
        $this->assertFalse($case->isOverdue());

        $this->travelTo('2026-11-13 09:00');
        $this->assertTrue($case->isOverdue());

        $this->get(route('inspections.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('counts.open_cases', 1)
                ->where('counts.overdue_cases', 1)
            );

        $this->get(route('inspections.cases.index', ['filter' => ['status' => 'vencido']]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('inspections/cases/index')
                ->has('cases.data', 1)
                ->where('cases.data.0.code', $case->code)
                ->where('cases.data.0.status_label', 'Plazo vencido')
            );

        $this->get(route('inspections.cases.index', ['filter' => ['status' => 'regularizado']]))
            ->assertInertia(fn (Assert $page) => $page->has('cases.data', 0));
    }

    public function test_issuing_a_licence_to_that_document_regularizes_the_case()
    {
        $case = $this->openCase();
        $other = InspectionCase::query()->create([
            ...$case->only('business_name', 'address', 'opened_by'),
            'year' => $case->year, 'sequence' => 2, 'code' => 'SEG-X', 'holder_document' => '11112222',
        ]);

        // The licence goes to the RUC 10 that holds the DNI given on site.
        $this->issueLicenseTo(Taxpayer::factory()->create([
            'document_type' => DocumentType::Ruc,
            'document_number' => '10456789125',
        ]));

        $case->refresh();
        $this->assertSame('regularizado', $case->status->value);
        $this->assertNotNull($case->license_id);
        $this->assertNotNull($case->resolved_at);
        $this->assertStringContainsString($case->license->number, $case->resolution_note);
        $this->assertSame('pendiente', $other->fresh()->status->value);
    }

    public function test_the_inspector_closes_the_case_by_hand()
    {
        $case = $this->openCase();

        $this->post(route('inspections.cases.close', $case), ['status' => 'derivado'])
            ->assertSessionHasErrors('resolution_note');

        $this->post(route('inspections.cases.close', $case), [
            'status' => 'derivado',
            'resolution_note' => 'No regularizó en el plazo: se deriva a Fiscalización Tributaria.',
        ])->assertRedirect();

        $case->refresh();
        $this->assertSame('derivado', $case->status->value);
        $this->assertSame($this->inspector->id, $case->resolved_by);

        $this->post(route('inspections.cases.notify', $case), ['notified_at' => today()->toDateString(), 'days' => 5])
            ->assertSessionHasErrors(['status' => 'Este caso ya está cerrado.']);

        $this->get(route('inspections.cases.show', $case))
            ->assertInertia(fn (Assert $page) => $page
                ->component('inspections/cases/show')
                ->where('case.status_label', 'Derivado a sanción')
                ->where('case.resolution_note', 'No regularizó en el plazo: se deriva a Fiscalización Tributaria.')
                ->has('case.inspections', 1)
            );
    }

    public function test_visits_recorded_before_cases_existed_get_one()
    {
        $visit = fn (string $at, array $data) => Inspection::create([
            'year' => 2026,
            'sequence' => Inspection::max('sequence') + 1,
            'code' => 'FIS-'.(Inspection::max('sequence') + 1),
            'inspector_id' => $this->inspector->id,
            'visited_at' => $at,
            'result' => 'sin_licencia',
            'business_name' => 'BODEGA SIN NOMBRE',
            'address' => 'JR. ARICA 10',
            ...$data,
        ]);

        $first = $visit('2026-11-10 09:00', ['holder_document' => '45678912']);
        $again = $visit('2026-11-12 09:00', ['holder_document' => '10456789125', 'business_name' => 'OTRO NOMBRE']);
        $anonymous = $visit('2026-11-11 09:00', ['business_name' => 'KIOSKO', 'address' => 'AV. LA TORRE 5']);
        $licensed = $visit('2026-11-09 09:00', ['holder_document' => '20123456789', 'business_name' => 'EMPRESA SAC']);

        // That company got its licence here after the visit.
        $this->issueLicenseTo(Taxpayer::factory()->create(['document_type' => DocumentType::Ruc, 'document_number' => '20123456789']));
        InspectionCase::query()->delete();
        Inspection::query()->update(['inspection_case_id' => null]);

        (require database_path('migrations/2026_11_19_130000_open_cases_for_earlier_visits.php'))->up();

        $this->assertSame(3, InspectionCase::count());
        $case = $first->fresh()->inspectionCase;
        $this->assertSame($case->id, $again->fresh()->inspection_case_id);
        $this->assertSame('BODEGA SIN NOMBRE', $case->business_name);
        $this->assertSame('pendiente', $case->status->value);
        $this->assertSame('2026-11-10 09:00:00', $case->created_at->format('Y-m-d H:i:s'));
        $this->assertSame('KIOSKO', $anonymous->fresh()->inspectionCase->business_name);
        $this->assertSame('regularizado', $licensed->fresh()->inspectionCase->status->value);
        $this->assertNotNull($licensed->fresh()->inspectionCase->license_id);
        $this->assertSame(
            ['SEG-2026-00001', 'SEG-2026-00002', 'SEG-2026-00003'],
            InspectionCase::orderBy('sequence')->pluck('code')->all(),
        );
    }

    public function test_only_inspectors_follow_cases()
    {
        $case = $this->openCase();
        $cashier = User::factory()->create();
        $cashier->assignRole('Caja');

        $this->actingAs($cashier)->get(route('inspections.cases.index'))->assertForbidden();
        $this->actingAs($cashier)->get(route('inspections.cases.show', $case))->assertForbidden();
    }
}
