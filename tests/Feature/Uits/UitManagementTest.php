<?php

namespace Tests\Feature\Uits;

use App\Models\Uit;
use App\Models\User;
use Database\Seeders\UitDevSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UitManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get(route('uits.index'))->assertRedirect(route('login'));
    }

    public function test_uits_are_paginated_on_the_server_from_the_most_recent_year()
    {
        $user = User::factory()->create();
        Uit::factory()->count(25)->sequence(fn ($sequence) => ['year' => 2001 + $sequence->index])->create();

        $this->actingAs($user)
            ->get(route('uits.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('uits/index')
                ->has('uits.data', 10)
                ->where('uits.data.0.year', 2025)
                ->where('uits.total', 25)
                ->where('uits.current_page', 1)
                ->where('uits.last_page', 3)
                ->where('filters.search', null)
                ->where('filters.sort', '-year')
            );

        $this->actingAs($user)
            ->get(route('uits.index', ['page' => 3]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('uits.data', 5)
                ->where('uits.data.0.year', 2005)
            );
    }

    public function test_uits_can_be_searched_by_year_or_legal_basis()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => 2024, 'legal_basis' => 'D.S. N° 309-2023-EF']);
        Uit::factory()->create(['year' => 2025, 'legal_basis' => 'D.S. N° 260-2024-EF']);

        $this->actingAs($user)
            ->get(route('uits.index', ['filter' => ['search' => '2024']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('uits.data', 2)
                ->where('filters.search', '2024')
            );

        $this->actingAs($user)
            ->get(route('uits.index', ['filter' => ['search' => '309']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('uits.data', 1)
                ->where('uits.data.0.year', 2024)
            );
    }

    public function test_search_containing_commas_is_not_split_into_several_values()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => 2025, 'legal_basis' => 'D.S. N° 260-2024-EF']);

        $this->actingAs($user)
            ->get(route('uits.index', ['filter' => ['search' => '260,2024']]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('uits.data', 0)
                ->where('filters.search', '260,2024')
            );
    }

    public function test_uits_can_be_sorted_by_allowed_columns()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => 2024, 'amount' => 5150]);
        Uit::factory()->create(['year' => 2025, 'amount' => 4950]);
        Uit::factory()->create(['year' => 2023, 'amount' => 5350]);

        $this->actingAs($user)
            ->get(route('uits.index', ['sort' => 'year']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('uits.data.0.year', 2023)
                ->where('filters.sort', 'year')
            );

        $this->actingAs($user)
            ->get(route('uits.index', ['sort' => '-amount']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('uits.data.0.amount', '5350.00')
                ->where('uits.data.2.amount', '4950.00')
            );
    }

    public function test_sorting_or_filtering_by_not_allowed_fields_is_rejected()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('uits.index', ['sort' => 'created_at']))
            ->assertBadRequest();

        $this->actingAs($user)
            ->get(route('uits.index', ['filter' => ['amount' => '5350']]))
            ->assertBadRequest();
    }

    public function test_pagination_shows_one_page_on_each_side_of_the_current_one()
    {
        $user = User::factory()->create();
        Uit::factory()->count(100)->sequence(fn ($sequence) => ['year' => 1927 + $sequence->index])->create();

        // ‹ 1 2 … 4 5 6 … 9 10 ›
        $this->actingAs($user)
            ->get(route('uits.index', ['page' => 5]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('uits.links', 11)
                ->where('uits.links.6.label', '6')
                ->where('uits.links.6.active', false)
                ->where('uits.links.5.active', true)
            );
    }

    public function test_requesting_a_page_beyond_the_last_redirects_to_the_last_page()
    {
        $user = User::factory()->create();
        Uit::factory()->count(12)->sequence(fn ($sequence) => ['year' => 2001 + $sequence->index])->create();

        $this->actingAs($user)
            ->get(route('uits.index', ['page' => 5, 'filter' => ['search' => '20']]))
            ->assertRedirect(route('uits.index', ['page' => 2, 'filter' => ['search' => '20']]));
    }

    public function test_uit_can_be_created()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('uits.index', ['page' => 2]))
            ->post(route('uits.store'), [
                'year' => 2025,
                'amount' => '5350.00',
                'legal_basis' => 'D.S. N° 260-2024-EF',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('uits.index', ['page' => 2]));

        $this->assertDatabaseHas('uits', [
            'year' => 2025,
            'amount' => '5350.00',
            'legal_basis' => 'D.S. N° 260-2024-EF',
        ]);
    }

    public function test_legal_basis_is_optional()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('uits.store'), ['year' => 2025, 'amount' => 5350])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('uits', ['year' => 2025, 'legal_basis' => null]);
    }

    public function test_year_must_be_unique()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => 2025]);

        $this->actingAs($user)
            ->post(route('uits.store'), ['year' => 2025, 'amount' => 5350])
            ->assertSessionHasErrors('year');

        $this->assertDatabaseCount('uits', 1);
    }

    public function test_invalid_data_is_rejected()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('uits.store'), [
                'year' => 1800,
                'amount' => '-10',
                'legal_basis' => str_repeat('a', 151),
            ])
            ->assertSessionHasErrors(['year', 'amount', 'legal_basis']);

        $this->actingAs($user)
            ->post(route('uits.store'), ['year' => 2025, 'amount' => '5350.123'])
            ->assertSessionHasErrors('amount');

        $this->actingAs($user)
            ->post(route('uits.store'), [])
            ->assertSessionHasErrors(['year', 'amount']);

        $this->assertDatabaseCount('uits', 0);
    }

    public function test_validation_messages_are_in_spanish()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => 2025]);

        $this->actingAs($user)
            ->post(route('uits.store'), ['year' => 2025])
            ->assertSessionHasErrors([
                'year' => 'El campo año ya ha sido registrado.',
                'amount' => 'El campo valor es obligatorio.',
            ]);
    }

    public function test_uit_can_be_updated()
    {
        $user = User::factory()->create();
        $uit = Uit::factory()->create(['year' => 2025, 'amount' => 5000]);

        $this->actingAs($user)
            ->from(route('uits.index', ['filter' => ['search' => '2025']]))
            ->put(route('uits.update', $uit), [
                'year' => 2025,
                'amount' => '5350.00',
                'legal_basis' => 'D.S. N° 260-2024-EF',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('uits.index', ['filter' => ['search' => '2025']]));

        $this->assertSame('5350.00', $uit->refresh()->amount);
        $this->assertSame('D.S. N° 260-2024-EF', $uit->legal_basis);
    }

    public function test_update_cannot_take_the_year_of_another_uit()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => 2024]);
        $uit = Uit::factory()->create(['year' => 2025]);

        $this->actingAs($user)
            ->put(route('uits.update', $uit), ['year' => 2024, 'amount' => 5350])
            ->assertSessionHasErrors('year');

        $this->assertSame(2025, $uit->refresh()->year);
    }

    public function test_uit_can_be_deleted()
    {
        $user = User::factory()->create();
        $uit = Uit::factory()->create();

        $this->actingAs($user)
            ->from(route('uits.index'))
            ->delete(route('uits.destroy', $uit))
            ->assertRedirect(route('uits.index'));

        $this->assertModelMissing($uit);
    }

    public function test_precognitive_request_validates_without_persisting()
    {
        $user = User::factory()->create();

        // The Precognition client sends "Accept: application/json".
        $this->actingAs($user)
            ->withPrecognition()
            ->postJson(route('uits.store'), ['year' => 2025, 'amount' => 5350])
            ->assertSuccessfulPrecognition();

        $this->actingAs($user)
            ->withPrecognition()
            ->postJson(route('uits.store'), ['year' => 1800, 'amount' => 5350])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('year');

        $this->assertDatabaseCount('uits', 0);
    }

    public function test_dev_seeder_creates_one_hundred_consecutive_years()
    {
        $this->seed(UitDevSeeder::class);

        $this->assertDatabaseCount('uits', 100);
        $this->assertSame(100, Uit::query()->distinct()->count('year'));
        $this->assertSame(now()->year, Uit::query()->max('year'));
    }

    public function test_dev_seeder_keeps_existing_years_and_can_run_twice()
    {
        $existing = Uit::factory()->create(['year' => now()->year, 'amount' => '5500.00']);

        $this->seed(UitDevSeeder::class);
        $this->seed(UitDevSeeder::class);

        $this->assertDatabaseCount('uits', 100);
        $this->assertSame('5500.00', $existing->refresh()->amount);
    }
}
