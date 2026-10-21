<?php

namespace Database\Factories;

use App\Models\Uit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Uit>
 */
class UitFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'year' => fake()->unique()->numberBetween(1995, (int) date('Y')),
            'amount' => fake()->randomFloat(2, 2000, 6000),
            'legal_basis' => 'D.S. N° '.fake()->numberBetween(100, 400).'-'.fake()->year().'-EF',
        ];
    }
}
