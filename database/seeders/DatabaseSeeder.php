<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * The dev user (password "password") only exists on developer machines:
     * anywhere else it would be a publicly known login, and factories need
     * Faker, absent from --no-dev builds. On a server, create the first
     * administrator with `php artisan app:create-admin`.
     */
    public function run(): void
    {
        if (app()->environment('local', 'testing')
            && User::query()->where('email', 'password@gmail.com')->doesntExist()) {
            User::factory()->create([
                'name' => 'Admin Dev',
                'email' => 'password@gmail.com',
            ]);
        }

        $this->call(RolesAndPermissionsSeeder::class);

        if (app()->isLocal()) {
            $this->call(UitDevSeeder::class);
        }
    }
}
