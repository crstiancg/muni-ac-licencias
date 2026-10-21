<?php

namespace Database\Seeders;

use App\Models\Uit;
use Illuminate\Database\Seeder;

/**
 * FAKE data for local development only (e.g. testing pagination).
 *
 * Creates 100 consecutive years ending in the current one, so most of them
 * fall before 1990 and would not pass UitValidationRules. Never run it in
 * production: real UIT values come from MEF supreme decrees.
 *
 * Idempotent: years that already exist are left untouched.
 */
class UitDevSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $years = range(now()->year - 99, now()->year);

        $missing = array_values(array_diff(
            $years,
            Uit::query()->whereIn('year', $years)->pluck('year')->all(),
        ));

        if ($missing === []) {
            return;
        }

        Uit::factory()
            ->count(count($missing))
            ->sequence(fn ($sequence) => ['year' => $missing[$sequence->index]])
            ->create();
    }
}
