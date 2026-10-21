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
     */
    public function run(): void
    {
        if (User::query()->where('email', 'password@gmail.com')->doesntExist()) {
            User::factory()->create([
                'name' => 'Admin Dev',
                'email' => 'password@gmail.com',
            ]);
        }

        if (app()->isLocal()) {
            $this->call(UitDevSeeder::class);
        }
    }
}
