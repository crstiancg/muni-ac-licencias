<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Access in production: seeding never creates a user with a known password;
 * the first administrator is created from the server's terminal.
 */
class ProductionAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_in_production_creates_roles_but_no_default_user()
    {
        $this->app->detectEnvironment(fn () => 'production');

        // As run on the server: production asks for confirmation without --force.
        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])
            ->assertSuccessful();

        $this->assertTrue(Role::where('name', Permission::ADMIN_ROLE)->exists());
        $this->assertSame(0, User::count());
    }

    public function test_the_first_administrator_is_created_from_the_terminal()
    {
        $this->artisan('app:create-admin')
            ->expectsQuestion('Nombre completo', 'Rosa Mamani Quispe')
            ->expectsQuestion('Correo electrónico', 'rmamani@munipuno.gob.pe')
            ->expectsQuestion('Contraseña', 'Una-clave-segura-2026')
            ->expectsQuestion('Repite la contraseña', 'Una-clave-segura-2026')
            ->assertSuccessful();

        $admin = User::where('email', 'rmamani@munipuno.gob.pe')->firstOrFail();
        $this->assertSame('Rosa Mamani Quispe', $admin->name);
        $this->assertTrue(Hash::check('Una-clave-segura-2026', $admin->password));
        $this->assertTrue($admin->is_active);
        $this->assertTrue($admin->hasRole(Permission::ADMIN_ROLE));
    }

    public function test_the_administrator_needs_a_strong_matching_password()
    {
        $this->artisan('app:create-admin')
            ->expectsQuestion('Nombre completo', 'Rosa Mamani Quispe')
            ->expectsQuestion('Correo electrónico', 'rmamani@munipuno.gob.pe')
            ->expectsQuestion('Contraseña', 'corta')
            ->expectsQuestion('Repite la contraseña', 'distinta')
            ->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_an_email_already_in_use_is_rejected()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        User::factory()->create(['email' => 'rmamani@munipuno.gob.pe']);

        $this->artisan('app:create-admin')
            ->expectsQuestion('Nombre completo', 'Otra Persona')
            ->expectsQuestion('Correo electrónico', 'rmamani@munipuno.gob.pe')
            ->expectsQuestion('Contraseña', 'Una-clave-segura-2026')
            ->expectsQuestion('Repite la contraseña', 'Una-clave-segura-2026')
            ->assertFailed();

        $this->assertSame(1, User::count());
    }
}
