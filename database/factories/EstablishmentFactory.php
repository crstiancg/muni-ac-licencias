<?php

namespace Database\Factories;

use App\Enums\EconomicSector;
use App\Enums\StreetType;
use App\Models\Establishment;
use App\Models\Taxpayer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Establishment>
 */
class EstablishmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'taxpayer_id' => Taxpayer::factory(),
            'activity' => fake()->randomElement(['BODEGA', 'RESTAURANTE', 'OPTICA', 'FARMACIA', 'LIBRERIA']),
            'economic_sector' => fake()->randomElement(EconomicSector::cases()),
            'street_type' => fake()->randomElement(StreetType::cases()),
            'street' => mb_strtoupper(fake()->lastName()),
            'number' => (string) fake()->numberBetween(1, 2000),
            'area' => fake()->randomFloat(2, 10, 500),
        ];
    }
}
