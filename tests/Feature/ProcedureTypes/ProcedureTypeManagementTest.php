<?php

namespace Tests\Feature\ProcedureTypes;

use App\Enums\RiskLevel;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProcedureTypeManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get(route('procedure-types.index'))->assertRedirect(route('login'));
    }

    public function test_active_procedure_types_are_paginated_by_position()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->count(12)->sequence(fn ($sequence) => ['position' => 12 - $sequence->index])->create();
        ProcedureType::factory()->inactive()->create(['position' => 0]);

        $this->actingAs($user)
            ->get(route('procedure-types.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('procedure-types/index')
                ->has('procedureTypes.data', 10)
                ->where('procedureTypes.data.0.position', 1)
                ->where('procedureTypes.total', 12)
                ->where('filters.search', null)
                ->where('filters.status', 'active')
                ->where('filters.sort', 'position')
                ->has('riskLevels', 4)
            );
    }

    public function test_fee_is_computed_with_the_uit_of_the_current_year()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => now()->year - 1, 'amount' => 5150]);
        Uit::factory()->create(['year' => now()->year, 'amount' => 5350]);
        ProcedureType::factory()->create(['uit_percentage' => '4.5196']);

        $this->actingAs($user)
            ->get(route('procedure-types.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('currentUit.year', now()->year)
                ->where('currentUit.amount', '5350.00')
                ->where('procedureTypes.data.0.uit_percentage', '4.5196')
                ->where('procedureTypes.data.0.fee', '241.80')
            );
    }

    public function test_fee_is_null_when_the_current_year_has_no_uit()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => now()->year - 1]);
        ProcedureType::factory()->create();

        $this->actingAs($user)
            ->get(route('procedure-types.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('currentUit', null)
                ->where('procedureTypes.data.0.fee', null)
            );
    }

    public function test_procedure_types_can_be_filtered_by_status()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->count(2)->create();
        ProcedureType::factory()->inactive()->count(3)->create();

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['filter' => ['status' => 'inactive']]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('procedureTypes.total', 3)
                ->where('filters.status', 'inactive')
            );

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['filter' => ['status' => 'all']]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('procedureTypes.total', 5)
                ->where('filters.status', 'all')
            );
    }

    public function test_procedure_types_can_be_searched_by_name_or_tupa_code()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->create(['name' => 'CESE DE ACTIVIDADES', 'tupa_code' => 'PA-13']);
        ProcedureType::factory()->create(['name' => 'DUPLICADO DE LICENCIA', 'tupa_code' => 'PA-11']);

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['filter' => ['search' => 'cese']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('procedureTypes.data', 1)
                ->where('procedureTypes.data.0.tupa_code', 'PA-13')
                ->where('filters.search', 'cese')
            );

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['filter' => ['search' => 'PA-11']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('procedureTypes.data', 1)
                ->where('procedureTypes.data.0.name', 'DUPLICADO DE LICENCIA')
            );
    }

    public function test_procedure_types_can_be_sorted_by_allowed_columns()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->create(['name' => 'B', 'uit_percentage' => 1]);
        ProcedureType::factory()->create(['name' => 'A', 'uit_percentage' => 7]);
        ProcedureType::factory()->create(['name' => 'C', 'uit_percentage' => 3]);

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['sort' => 'name']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('procedureTypes.data.0.name', 'A')
                ->where('filters.sort', 'name')
            );

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['sort' => '-uit_percentage']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('procedureTypes.data.0.name', 'A')
                ->where('procedureTypes.data.2.name', 'B')
            );
    }

    public function test_sorting_or_filtering_by_not_allowed_fields_is_rejected()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['sort' => 'legacy_amount']))
            ->assertBadRequest();

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['filter' => ['legacy_id' => '1']]))
            ->assertBadRequest();
    }

    public function test_requesting_a_page_beyond_the_last_redirects_to_the_last_page()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->count(12)->create();

        $this->actingAs($user)
            ->get(route('procedure-types.index', ['page' => 5]))
            ->assertRedirect(route('procedure-types.index', ['page' => 2]));
    }

    public function test_procedure_type_can_be_created()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('procedure-types.index', ['page' => 2]))
            ->post(route('procedure-types.store'), [
                'tupa_code' => 'PA-01',
                'name' => 'LICENCIA DE FUNCIONAMIENTO RIESGO BAJO',
                'description' => 'Con ITSE posterior.',
                'uit_percentage' => '4.5196',
                'risk_level' => 'bajo',
                'processing_days' => 4,
                'legal_basis' => 'Ordenanza N° 123-2022-CMPP',
                'position' => 1,
                'is_active' => '1',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('procedure-types.index', ['page' => 2]));

        $type = ProcedureType::sole();

        $this->assertSame('PA-01', $type->tupa_code);
        $this->assertSame('4.5196', $type->uit_percentage);
        $this->assertSame(RiskLevel::Low, $type->risk_level);
        $this->assertSame(4, $type->processing_days);
        $this->assertTrue($type->is_active);
        $this->assertNull($type->legacy_id);
    }

    public function test_only_name_and_percentage_are_required()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->create(['position' => 7]);

        $this->actingAs($user)
            ->post(route('procedure-types.store'), ['name' => 'CESE DE ACTIVIDADES', 'uit_percentage' => 0])
            ->assertSessionHasNoErrors();

        $type = ProcedureType::query()->where('name', 'CESE DE ACTIVIDADES')->sole();

        $this->assertSame(8, $type->position, 'Position defaults to the next one.');
        $this->assertTrue($type->is_active);
        $this->assertNull($type->risk_level);
        $this->assertNull($type->tupa_code);
    }

    public function test_tupa_code_must_be_unique()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->create(['tupa_code' => 'PA-01']);

        $this->actingAs($user)
            ->post(route('procedure-types.store'), ['name' => 'X', 'uit_percentage' => 1, 'tupa_code' => 'PA-01'])
            ->assertSessionHasErrors('tupa_code');

        $this->assertDatabaseCount('procedure_types', 1);
    }

    public function test_invalid_data_is_rejected()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('procedure-types.store'), [
                'name' => str_repeat('a', 256),
                'uit_percentage' => '100.0001',
                'tupa_code' => str_repeat('a', 21),
                'risk_level' => 'extremo',
                'processing_days' => 0,
                'legal_basis' => str_repeat('a', 151),
                'position' => -1,
                'is_active' => 'quizas',
            ])
            ->assertSessionHasErrors([
                'name', 'uit_percentage', 'tupa_code', 'risk_level',
                'processing_days', 'legal_basis', 'position', 'is_active',
            ]);

        $this->actingAs($user)
            ->post(route('procedure-types.store'), ['name' => 'X', 'uit_percentage' => '4.51956'])
            ->assertSessionHasErrors('uit_percentage');

        $this->actingAs($user)
            ->post(route('procedure-types.store'), [])
            ->assertSessionHasErrors(['name', 'uit_percentage']);

        $this->assertDatabaseCount('procedure_types', 0);
    }

    public function test_validation_messages_are_in_spanish()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('procedure-types.store'), [])
            ->assertSessionHasErrors([
                'name' => 'El campo nombre es obligatorio.',
                'uit_percentage' => 'El campo porcentaje de UIT es obligatorio.',
            ]);
    }

    public function test_procedure_type_can_be_updated()
    {
        $user = User::factory()->create();
        $type = ProcedureType::factory()->create(['tupa_code' => 'PA-01', 'risk_level' => RiskLevel::Low]);

        $this->actingAs($user)
            ->from(route('procedure-types.index', ['filter' => ['status' => 'all']]))
            ->put(route('procedure-types.update', $type), [
                'tupa_code' => 'PA-01',
                'name' => 'NUEVO NOMBRE',
                'uit_percentage' => '5.8000',
                'risk_level' => '',
                'position' => 3,
                'is_active' => '0',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('procedure-types.index', ['filter' => ['status' => 'all']]));

        $type->refresh();

        $this->assertSame('NUEVO NOMBRE', $type->name);
        $this->assertSame('5.8000', $type->uit_percentage);
        $this->assertNull($type->risk_level);
        $this->assertSame(3, $type->position);
        $this->assertFalse($type->is_active);
    }

    public function test_update_cannot_take_the_tupa_code_of_another_type()
    {
        $user = User::factory()->create();
        ProcedureType::factory()->create(['tupa_code' => 'PA-01']);
        $type = ProcedureType::factory()->create(['tupa_code' => 'PA-02']);

        $this->actingAs($user)
            ->put(route('procedure-types.update', $type), ['name' => 'X', 'uit_percentage' => 1, 'tupa_code' => 'PA-01'])
            ->assertSessionHasErrors('tupa_code');

        $this->assertSame('PA-02', $type->refresh()->tupa_code);
    }

    public function test_procedure_type_can_be_deleted()
    {
        $user = User::factory()->create();
        $type = ProcedureType::factory()->create();

        $this->actingAs($user)
            ->from(route('procedure-types.index'))
            ->delete(route('procedure-types.destroy', $type))
            ->assertRedirect(route('procedure-types.index'));

        $this->assertModelMissing($type);
    }

    public function test_precognitive_request_validates_without_persisting()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withPrecognition()
            ->postJson(route('procedure-types.store'), ['name' => 'X', 'uit_percentage' => 1])
            ->assertSuccessfulPrecognition();

        $this->actingAs($user)
            ->withPrecognition()
            ->postJson(route('procedure-types.store'), ['name' => 'X', 'uit_percentage' => 101])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('uit_percentage');

        $this->assertDatabaseCount('procedure_types', 0);
    }

    public function test_only_high_risk_levels_require_a_prior_itse()
    {
        $this->assertFalse(RiskLevel::Low->requiresPriorItse());
        $this->assertFalse(RiskLevel::Medium->requiresPriorItse());
        $this->assertTrue(RiskLevel::High->requiresPriorItse());
        $this->assertTrue(RiskLevel::VeryHigh->requiresPriorItse());
    }
}
