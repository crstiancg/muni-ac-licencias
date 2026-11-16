<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Accounts are created by an administrator and the system sends no mail:
 * an unverified email must never lock anyone out.
 */
class NoEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_without_a_verified_email_uses_the_system(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    public function test_the_verification_screen_does_not_exist(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get('/email/verify')->assertNotFound();
    }

    public function test_changing_the_email_keeps_the_user_in(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.update'), ['name' => $user->name, 'email' => 'nuevo@example.com'])
            ->assertSessionHasNoErrors();

        $this->actingAs($user->refresh())->get(route('dashboard'))->assertOk();
    }
}
