<?php

namespace Tests\Feature\Procedures;

use App\Actions\Procedures\RegisterProcedure;
use App\Enums\ProcedureStatus;
use App\Models\Establishment;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The procedures list: how many are waiting at each step, and filters to
 * find them by procedure type or registration date.
 */
class ProcedureListTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
    }

    private function clerk(): User
    {
        $user = User::factory()->create();
        $user->assignRole('Mesa de partes');

        return $user;
    }

    private function procedure(ProcedureType $type): Procedure
    {
        $establishment = Establishment::factory()->create();

        return app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);
    }

    private function type(string $name): ProcedureType
    {
        return ProcedureType::factory()->create(['name' => $name, 'is_active' => true, 'uit_percentage' => 0]);
    }

    public function test_the_list_counts_the_procedures_at_each_step()
    {
        $type = $this->type('Licencia de funcionamiento');
        $this->procedure($type);
        $this->procedure($type);
        $this->procedure($type)->update(['status' => ProcedureStatus::Cancelled]);

        $this->actingAs($this->clerk())
            ->get(route('procedures.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('status_counts.registrado', 2)
                ->where('status_counts.anulado', 1)
            );
    }

    public function test_the_list_filters_by_procedure_type()
    {
        $licence = $this->type('Licencia de funcionamiento');
        $sign = $this->type('Autorización de anuncio');
        $wanted = $this->procedure($sign);
        $this->procedure($licence);

        $this->actingAs($this->clerk())
            ->get(route('procedures.index', ['filter' => ['type' => $sign->id]]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('procedures.data', 1)
                ->where('procedures.data.0.id', $wanted->id)
                ->where('filters.type', (string) $sign->id)
                ->has('types', 2)
            );
    }

    public function test_the_list_filters_by_registration_date()
    {
        $type = $this->type('Licencia de funcionamiento');
        $this->procedure($type)->forceFill(['created_at' => '2026-09-15 10:00:00'])->save();
        $inRange = $this->procedure($type);
        $inRange->forceFill(['created_at' => '2026-10-05 10:00:00'])->save();
        $this->procedure($type)->forceFill(['created_at' => '2026-11-02 10:00:00'])->save();

        $this->actingAs($this->clerk())
            ->get(route('procedures.index', ['filter' => ['from' => '2026-10-01', 'to' => '2026-10-31']]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('procedures.data', 1)
                ->where('procedures.data.0.id', $inRange->id)
                ->where('filters.from', '2026-10-01')
                ->where('filters.to', '2026-10-31')
            );
    }
}
