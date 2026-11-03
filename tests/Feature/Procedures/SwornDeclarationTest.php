<?php

namespace Tests\Feature\Procedures;

use App\Actions\Procedures\RegisterProcedure;
use App\Models\Establishment;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
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
        $establishment->taxpayer->update(['representative_name' => 'APODERADO ANTERIOR']);
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
            ->assertSee('40123456')
            ->assertSee('951000111')
            ->assertDontSee('APODERADO ANTERIOR');
    }

    public function test_a_new_taxpayer_keeps_the_declared_representative_for_next_time()
    {
        $type = ProcedureType::factory()->create(['is_active' => true]);

        $this->actingAs($this->clerk)
            ->post(route('procedures.store'), [
                'procedure_type_ids' => [$type->id],
                'taxpayer' => [
                    'document_type' => 'ce',
                    'document_number' => 'X1234567',
                    'name' => 'PEREZ JUAN',
                    'address' => 'JR. LIMA 123',
                    'district' => 'PUNO',
                    'province' => 'PUNO',
                    'department' => 'PUNO',
                ],
                'establishment' => ['activity' => 'BODEGA', 'street' => 'LIMA'],
                'declaration' => $this->declaration([
                    'representative_name' => 'QUISPE MAMANI ROSA',
                    'representative_document' => '40123456',
                ]),
            ])
            ->assertSessionHasNoErrors();

        $taxpayer = Procedure::query()->sole()->taxpayer;
        $this->assertSame('QUISPE MAMANI ROSA', $taxpayer->representative_name);
        $this->assertSame('40123456', $taxpayer->representative_document);
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
