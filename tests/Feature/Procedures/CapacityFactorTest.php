<?php

namespace Tests\Feature\Procedures;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CapacityFactorTest extends TestCase
{
    use RefreshDatabase;

    public function test_forms_receive_the_area_per_person_to_suggest_the_capacity()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');

        $this->actingAs($clerk)
            ->get(route('procedures.create'))
            ->assertInertia(fn (Assert $page) => $page->where('areaPerPerson', 1.5));
    }

    public function test_the_area_per_person_is_configurable()
    {
        config(['licencias.area_per_person' => 2.8]);
        $this->seed(RolesAndPermissionsSeeder::class);
        $clerk = User::factory()->create();
        $clerk->assignRole('Mesa de partes');

        $this->actingAs($clerk)
            ->get(route('procedures.create'))
            ->assertInertia(fn (Assert $page) => $page->where('areaPerPerson', 2.8));
    }
}
