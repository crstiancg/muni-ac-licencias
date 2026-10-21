<?php

namespace Tests\Feature\Uits;

use App\Models\Uit;
use App\Models\User;
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

    public function test_uits_are_listed_from_the_most_recent_year()
    {
        $user = User::factory()->create();
        Uit::factory()->create(['year' => 2024, 'amount' => 5150]);
        Uit::factory()->create(['year' => 2025, 'amount' => 5350]);

        $this->actingAs($user)
            ->get(route('uits.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('uits/index')
                ->has('uits', 2)
                ->where('uits.0.year', 2025)
                ->where('uits.0.amount', '5350.00')
                ->where('uits.1.year', 2024)
            );
    }

    public function test_create_page_is_displayed()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('uits.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('uits/create'));
    }

    public function test_uit_can_be_created()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('uits.store'), [
                'year' => 2025,
                'amount' => '5350.00',
                'legal_basis' => 'D.S. N° 260-2024-EF',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('uits.index'));

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
                'year' => 'El valor del campo año ya está en uso.',
                'amount' => 'El campo valor es obligatorio.',
            ]);
    }

    public function test_edit_page_is_displayed()
    {
        $user = User::factory()->create();
        $uit = Uit::factory()->create(['year' => 2025]);

        $this->actingAs($user)
            ->get(route('uits.edit', $uit))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('uits/edit')
                ->where('uit.id', $uit->id)
                ->where('uit.year', 2025)
            );
    }

    public function test_uit_can_be_updated()
    {
        $user = User::factory()->create();
        $uit = Uit::factory()->create(['year' => 2025, 'amount' => 5000]);

        $this->actingAs($user)
            ->put(route('uits.update', $uit), [
                'year' => 2025,
                'amount' => '5350.00',
                'legal_basis' => 'D.S. N° 260-2024-EF',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('uits.index'));

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
}
