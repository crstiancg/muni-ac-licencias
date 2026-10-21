<?php

namespace Database\Factories;

use App\Enums\DocumentType;
use App\Models\Taxpayer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Taxpayer>
 */
class TaxpayerFactory extends Factory
{
    /**
     * Define the model's default state: a natural person with DNI.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'document_type' => DocumentType::Dni,
            'document_number' => fake()->unique()->numerify('########'),
            'name' => mb_strtoupper(fake()->lastName().' '.fake()->lastName().' '.fake()->firstName()),
            'phone' => fake()->numerify('9########'),
            'address' => mb_strtoupper(fake()->streetAddress()),
            'district' => 'PUNO',
            'province' => 'PUNO',
            'department' => 'PUNO',
        ];
    }
}
