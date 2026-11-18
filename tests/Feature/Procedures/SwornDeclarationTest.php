<?php

namespace Tests\Feature\Procedures;

use App\Actions\Procedures\RegisterProcedure;
use App\Models\Establishment;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use App\Support\SwornDeclaration;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SwornDeclarationTest extends TestCase
{
    use RefreshDatabase;

    private User $clerk;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->clerk = User::factory()->create();
        $this->clerk->assignRole('Mesa de partes');
    }

    /**
     * @return array<string, mixed>
     */
    private function declaration(array $overrides = []): array
    {
        return [
            'length' => 10,
            'width' => 17.15,
            'flammable_materials' => false,
            'construction_material' => 'noble',
            'extinguisher_pqs_kg' => 4,
            'extinguisher_co2_kg' => null,
            'signage' => true,
            'breakers' => true,
            'first_aid_kit' => true,
            'wiring_conduits' => true,
            'sign' => false,
            'sign_luminous' => null,
            'sign_features' => null,
            'sign_material' => null,
            'sign_length' => null,
            'sign_height' => null,
            ...$overrides,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Establishment $establishment, ProcedureType $type, array $overrides = []): array
    {
        return [
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => $this->declaration(),
            ...$overrides,
        ];
    }

    public function test_registering_a_procedure_saves_its_sworn_declaration_without_mesa_de_partes_data()
    {
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type))
            ->assertSessionHasNoErrors();

        $procedure = Procedure::query()->sole();

        $this->assertMatchesRegularExpression('/^\d{4}-\d{5}$/', $procedure->code);
        $this->assertNull($procedure->file_number);
        $this->assertSame(17.15, $procedure->declaration['width']);
        $this->assertFalse($procedure->declaration['flammable_materials']);
        $this->assertTrue($procedure->declaration['first_aid_kit']);
        $this->assertSame('noble', $procedure->declaration['construction_material']);
    }

    public function test_the_representative_is_declared_per_procedure_without_touching_the_taxpayer()
    {
        $establishment = Establishment::factory()->create();
        $establishment->taxpayer->update(['document_type' => 'ruc', 'document_number' => '20616230949', 'ruc' => null, 'representative_name' => 'APODERADO ANTERIOR']);
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type, [
                'declaration' => $this->declaration([
                    'representative_name' => 'QUISPE MAMANI ROSA',
                    'representative_document' => '40123456',
                    'representative_sunarp' => '11002233',
                    'representative_phone' => '951000111',
                ]),
            ]))
            ->assertSessionHasNoErrors();

        $procedure = Procedure::query()->sole();
        $this->assertSame('QUISPE MAMANI ROSA', $procedure->declaration['representative_name']);
        $this->assertSame('951000111', $procedure->declaration['representative_phone']);
        $this->assertSame('APODERADO ANTERIOR', $establishment->taxpayer->fresh()->representative_name);

        $this->actingAs($this->clerk)
            ->get(route('procedures.declaration.print', $procedure))
            ->assertSee('QUISPE MAMANI ROSA')
            ->assertSee('951000111')
            ->assertDontSee('APODERADO ANTERIOR')
            // A company: the representative's DNI as the applicant's, its own RUC in "13. RUC".
            ->assertSeeInOrder(['II. DATOS DEL SOLICITANTE', '<td class="v">40123456</td>', '>20616230949</td>', '10. Nro. de DNI o CE', '13. RUC', 'III. REPRESENTANTE LEGAL', '<td class="v">40123456</td>'], false);
    }

    public function test_a_natural_person_prints_its_dni_and_ruc_in_their_own_fields()
    {
        $establishment = Establishment::factory()->create();
        $establishment->taxpayer->update(['document_type' => 'dni', 'document_number' => '01234567', 'ruc' => '10012345678']);
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $procedure = app(RegisterProcedure::class)->handle($this->payload($establishment, $type));

        $this->actingAs($this->clerk)
            ->get(route('procedures.declaration.print', $procedure))
            ->assertSeeInOrder(['II. DATOS DEL SOLICITANTE', '<td class="v">01234567</td>', '>10012345678</td>', '10. Nro. de DNI o CE'], false);

        // Registered by its RUC 10: the RUC goes in "13. RUC", not in the DNI field.
        $establishment = Establishment::factory()->create();
        $establishment->taxpayer->update(['document_type' => 'ruc', 'document_number' => '10456789012', 'ruc' => null]);
        $procedure = app(RegisterProcedure::class)->handle($this->payload($establishment, $type));

        $this->actingAs($this->clerk)
            ->get(route('procedures.declaration.print', $procedure))
            ->assertSeeInOrder(['II. DATOS DEL SOLICITANTE', '<td class="v"></td>', 'text-transform:none', '>10456789012</td>', '10. Nro. de DNI o CE'], false);
    }

    public function test_a_new_taxpayer_keeps_the_declared_representative_for_next_time()
    {
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), [
                'procedure_type_ids' => [$type->id],
                'taxpayer' => [
                    'document_type' => 'ruc',
                    'document_number' => '20616230949',
                    'name' => 'GRUPO SAC',
                    'address' => 'JR. LIMA',
                    'number' => '123',
                    'interior' => '201',
                    'block' => 'F',
                    'lot' => '12',
                    'settlement' => 'URB. CHANU CHANU',
                    'district' => 'PUNO',
                    'province' => 'PUNO',
                    'department' => 'PUNO',
                ],
                'establishment' => ['activity' => 'BODEGA', 'street' => 'LIMA'],
                'declaration' => $this->declaration([
                    'representative_name' => 'QUISPE MAMANI ROSA',
                    'representative_document' => '40123456',
                    'representative_sunarp' => '11002233',
                ]),
            ])
            ->assertSessionHasNoErrors();

        $taxpayer = Procedure::query()->sole()->taxpayer;
        $this->assertSame('QUISPE MAMANI ROSA', $taxpayer->representative_name);
        $this->assertSame('40123456', $taxpayer->representative_document);
        $this->assertSame(['123', '201', 'F', '12', 'URB. CHANU CHANU'], [$taxpayer->number, $taxpayer->interior, $taxpayer->block, $taxpayer->lot, $taxpayer->settlement]);
    }

    public function test_a_company_declares_its_sunarp_registry_entry()
    {
        $establishment = Establishment::factory()->create();
        $establishment->taxpayer->update(['document_type' => 'ruc', 'document_number' => '20616230949', 'ruc' => null]);
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type))
            ->assertSessionHasErrors(['declaration.representative_sunarp' => 'La partida registral (SUNARP) es obligatoria para una empresa (RUC 20).']);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type, [
                'declaration' => $this->declaration(['representative_sunarp' => '11023456']),
            ]))
            ->assertSessionHasNoErrors();
    }

    public function test_a_new_company_declares_its_sunarp_registry_entry_too()
    {
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), [
                'procedure_type_ids' => [$type->id],
                'taxpayer' => ['document_type' => 'ruc', 'document_number' => '20616230949', 'name' => 'GRUPO SAC', 'address' => 'JR. LIMA', 'district' => 'PUNO', 'province' => 'PUNO', 'department' => 'PUNO'],
                'establishment' => ['activity' => 'BODEGA', 'street' => 'LIMA'],
                'declaration' => $this->declaration(),
            ])
            ->assertSessionHasErrors('declaration.representative_sunarp');
    }

    public function test_a_natural_person_does_not_need_a_sunarp_registry_entry()
    {
        $establishment = Establishment::factory()->create();
        $establishment->taxpayer->update(['document_type' => 'dni', 'document_number' => '01234567']);
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type))
            ->assertSessionHasNoErrors();
    }

    public function test_only_a_company_declares_a_legal_representative()
    {
        $establishment = Establishment::factory()->create();
        $establishment->taxpayer->update(['document_type' => 'dni', 'document_number' => '01234567', 'representative_name' => 'APODERADO DEL SISTEMA ANTERIOR']);
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type, [
                'declaration' => $this->declaration(['representative_name' => 'QUISPE MAMANI ROSA', 'representative_document' => '40123456']),
            ]))
            ->assertSessionHasNoErrors();

        $procedure = Procedure::query()->sole();
        $this->assertNull($procedure->declaration['representative_name']);
        $this->assertNull($procedure->declaration['representative_document']);

        // Not even an older DJ falls back to the representative in the file.
        $procedure->update(['declaration' => collect($procedure->declaration)->except(SwornDeclaration::REPRESENTATIVE)->all()]);

        $this->actingAs($this->clerk)
            ->get(route('procedures.declaration.print', $procedure))
            ->assertDontSee('QUISPE MAMANI ROSA')
            ->assertDontSee('APODERADO DEL SISTEMA ANTERIOR');
    }

    public function test_the_applicant_address_prints_with_its_number_interior_block_lot_and_settlement()
    {
        $establishment = Establishment::factory()->create();
        $establishment->taxpayer->update(['address' => 'JR. LIMA', 'number' => '456', 'interior' => '201', 'block' => 'F', 'lot' => '12', 'settlement' => 'AA.HH. SAN JOSE']);
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $procedure = app(RegisterProcedure::class)->handle($this->payload($establishment, $type));

        $this->actingAs($this->clerk)
            ->get(route('procedures.declaration.print', $procedure))
            ->assertSeeInOrder([
                'II. DATOS DEL SOLICITANTE',
                '>JR. LIMA</td>',
                '>456</td>',
                '>201</td>',
                '>F</td>',
                '>12</td>',
                '14. Av./Jr./Ca./Pje.',
                '15. Nro.',
                '>AA.HH. SAN JOSE</td>',
                '16. Urb., AA.HH, Barrio, Otros',
            ], false);
    }

    public function test_the_sworn_declaration_is_required_to_register()
    {
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type, ['declaration' => null]))
            ->assertSessionHasErrors('declaration');

        $this->assertDatabaseCount('procedures', 0);
    }

    public function test_a_sign_needs_its_characteristics()
    {
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), $this->payload($establishment, $type, [
                'declaration' => $this->declaration(['sign' => true]),
            ]))
            ->assertSessionHasErrors(['declaration.sign_luminous', 'declaration.sign_length', 'declaration.sign_height']);
    }

    public function test_the_sworn_declaration_prints_with_the_procedure_code_and_fee()
    {
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $establishment = Establishment::factory()->create(['trade_name' => 'VOLCANOOVIP']);
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855]);

        $procedure = app(RegisterProcedure::class)->handle($this->payload($establishment, $type));

        $this->actingAs($this->clerk)
            ->get(route('procedures.declaration.print', $procedure))
            ->assertOk()
            ->assertSee('Declaración jurada', false)
            ->assertSee($procedure->code)
            ->assertSee('VOLCANOOVIP')
            ->assertSee($type->name)
            ->assertSee('208.20')
            // Identical to the printed form: two sheets with its numbering.
            ->assertSee('SOLICITUD DE DECLARACION JURADA PARA LA LICENCIA DE FUNCIONAMIENTO')
            ->assertSeeInOrder([
                'I. MODALIDAD DE TRAMITE QUE SE SOLICITA',
                'II. DATOS DEL SOLICITANTE',
                'III. REPRESENTANTE LEGAL',
                'IV. DATOS DEL ESTABLECIMIENTO',
                'V. OTROS DATOS DEL ESTABLECIMIENTO',
                '37. DECLARO BAJO JURAMENTO QUE:',
                'class="sheet"',
                '38. VI. DECLARACION JURADA SECTORIAL',
                '39. VII. DECLARACION JURADA DE PROCESO DE INSPECCION TECNICA DE SEGURIDAD EN EDIFICACIONES',
                '40. VIII. DECLARACION JURADA DE ANUNCIO ADOSADO A FACHADA',
                '41. ORDEN DE PAGO',
            ], false)
            ->assertSee('171.50');
    }

    public function test_mesa_de_partes_records_the_file_number_after_the_declaration()
    {
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true]);
        $procedure = app(RegisterProcedure::class)->handle($this->payload($establishment, $type));

        $this->actingAs($this->clerk)
            ->put(route('procedures.reception', $procedure), [
                'file_number' => '12345-2026',
                'folios' => 8,
                'notes' => 'Adjunta copia de DNI.',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $procedure->refresh();
        $this->assertSame('12345-2026', $procedure->file_number);
        $this->assertSame(8, $procedure->folios);
        $this->assertSame('Adjunta copia de DNI.', $procedure->notes);
        $this->assertDatabaseHas('procedure_events', ['procedure_id' => $procedure->id, 'type' => 'recepcionado']);
    }

    public function test_users_without_permission_cannot_record_the_reception()
    {
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true]);
        $procedure = app(RegisterProcedure::class)->handle($this->payload($establishment, $type));

        $this->actingAs(User::factory()->create())
            ->put(route('procedures.reception', $procedure), ['file_number' => '1'])
            ->assertForbidden();
    }

    public function test_an_existing_establishment_brings_back_its_last_declaration_to_confirm()
    {
        $establishment = Establishment::factory()->create();
        $empty = Establishment::factory()->create(['taxpayer_id' => $establishment->taxpayer_id]);
        $type = ProcedureType::factory()->create(['is_active' => true]);
        $register = fn (array $declaration) => app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => $this->declaration($declaration),
        ]);

        $register(['length' => 8]);
        $last = $register(['length' => 12, 'construction_material' => 'adobe', 'representative_name' => 'PEREZ LUIS']);
        $register(['length' => 99])->update(['status' => 'anulado']);

        $this->actingAs($this->clerk)
            ->getJson(route('taxpayers.establishments', $establishment->taxpayer_id))
            ->assertOk()
            ->assertJsonPath('0.id', $empty->id)
            ->assertJsonPath('0.last_declaration', null)
            ->assertJsonPath('1.last_declaration.procedure_code', $last->code)
            ->assertJsonPath('1.last_declaration.declaration.length', 12)
            ->assertJsonPath('1.last_declaration.declaration.construction_material', 'adobe')
            ->assertJsonMissingPath('1.last_declaration.declaration.representative_name');
    }
}
