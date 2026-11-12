<?php

namespace Tests\Feature;

use App\Enums\LicenseStatus;
use App\Models\Establishment;
use App\Models\License;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Names are stored in capitals but staff type them however they like. MySQL
 * compares case-insensitively; Postgres' LIKE does not, so searches use
 * whereLike (ILIKE there). Run this suite on pgsql to cover it.
 */
class CaseInsensitiveSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_lowercase_search_finds_a_licence_stored_in_capitals()
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $establishment = Establishment::factory()->create();
        $license = License::create([
            'type' => 'licencia',
            'year' => 2026,
            'sequence' => 1,
            'number' => 'LF-2026-00001',
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'issued_at' => '2026-10-01',
            'status' => LicenseStatus::Active,
            'holder_name' => 'MAMANI QUISPE ANA',
            'holder_document' => '01234567',
            'activity' => 'BODEGA',
            'address' => 'JR. LIMA 123',
        ]);

        $user = User::factory()->create();
        $user->assignRole('Mesa de partes');

        $this->actingAs($user)
            ->get(route('licenses.index', ['filter' => ['search' => 'mamani quispe']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('licenses.data', 1)
                ->where('licenses.data.0.id', $license->id)
            );
    }
}
