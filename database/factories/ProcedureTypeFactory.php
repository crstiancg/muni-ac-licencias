<?php

namespace Database\Factories;

use App\Models\ProcedureType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProcedureType>
 */
class ProcedureTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => mb_strtoupper(fake()->unique()->sentence(4)),
            'uit_percentage' => fake()->randomFloat(4, 0, 10),
            'position' => fake()->numberBetween(1, 50),
            'is_active' => true,
        ];
    }

    /**
     * A procedure type from a previous TUPA, no longer offered.
     */
    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
