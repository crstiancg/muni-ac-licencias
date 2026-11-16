<?php

namespace Tests\Feature;

use App\Actions\Procedures\IssueDocuments;
use App\Actions\Procedures\IssuePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Actions\Procedures\RegisterProcedure;
use App\Models\Establishment;
use App\Models\License;
use App\Models\ProcedureType;
use App\Models\Uit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The municipality works in Peru (UTC-5, no daylight saving). In UTC, a
 * licence issued after 19:00 printed the next day's date.
 */
class PeruTimezoneTest extends TestCase
{
    use RefreshDatabase;

    private function issueLicense(): License
    {
        Uit::factory()->create(['year' => now()->year, 'amount' => 5500]);
        $establishment = Establishment::factory()->create();
        $type = ProcedureType::factory()->create(['is_active' => true, 'uit_percentage' => 3.7855, 'document_type' => 'licencia']);

        $procedure = app(RegisterProcedure::class)->handle([
            'procedure_type_ids' => [$type->id],
            'taxpayer_id' => $establishment->taxpayer_id,
            'establishment_id' => $establishment->id,
            'declaration' => ['flammable_materials' => false, 'signage' => true, 'breakers' => true, 'first_aid_kit' => true, 'wiring_conduits' => true, 'sign' => false],
        ]);

        $order = app(IssuePaymentOrder::class)->handle($procedure->load('types'));
        app(RegisterPayment::class)->handle($order, '44025', now()->toDateString());

        return app(IssueDocuments::class)->handle($procedure->fresh(), [], null, null, ['licencia' => '0010234'])->first();
    }

    public function test_the_system_runs_on_peru_time()
    {
        $this->assertSame('America/Lima', config('app.timezone'));
    }

    public function test_a_licence_issued_at_night_keeps_that_day()
    {
        // 20:30 in Puno is already 01:30 of the next day in UTC.
        $this->travelTo(Carbon::parse('2026-11-16 20:30', 'America/Lima'));

        $license = $this->issueLicense();

        $this->assertSame('2026-11-16', $license->fresh()->issued_at->toDateString());
        $this->assertSame('2026-11-16 20:30', $license->procedure->created_at->format('Y-m-d H:i'));
    }

    public function test_the_data_fix_moves_utc_times_to_peru_and_spares_imported_ones()
    {
        $license = $this->issueLicense();
        $procedureId = $license->procedure_id;

        // As written while the app ran in UTC: 01:30 of the 17th = 20:30 of the 16th in Puno.
        DB::table('licenses')->where('id', $license->id)->update(['created_at' => '2026-11-17 01:30:00', 'issued_at' => '2026-11-17']);
        DB::table('procedures')->where('id', $procedureId)->update(['created_at' => '2026-11-17 01:30:00']);

        // Imported from the old system, already in Peru time.
        $legacyId = DB::table('procedures')->insertGetId([
            ...collect(DB::table('procedures')->find($procedureId))->except('id')->all(),
            'code' => 'H-1',
            'year' => 2020,
            'sequence' => 999,
            'legacy_id' => 1,
            'created_at' => '2020-05-10 09:00:00',
        ]);
        DB::table('procedure_events')->insert(['procedure_id' => $legacyId, 'type' => 'importado', 'created_at' => '2020-05-10 09:00:00']);
        DB::table('procedure_events')->insert(['procedure_id' => $legacyId, 'type' => 'licencia_confirmada', 'created_at' => '2026-11-17 02:00:00']);

        (require database_path('migrations/2026_11_17_120000_move_stored_times_to_peru.php'))->up();

        $this->assertSame('2026-11-16 20:30:00', $this->time('licenses', $license->id));
        $this->assertSame('2026-11-16', substr((string) DB::table('licenses')->where('id', $license->id)->value('issued_at'), 0, 10));
        $this->assertSame('2026-11-16 20:30:00', $this->time('procedures', $procedureId));
        // Imported: untouched. Done later in this system: moved.
        $this->assertSame('2020-05-10 09:00:00', $this->time('procedures', $legacyId));
        $this->assertSame('2020-05-10 09:00:00', $this->time('procedure_events', null, ['procedure_id' => $legacyId, 'type' => 'importado']));
        $this->assertSame('2026-11-16 21:00:00', $this->time('procedure_events', null, ['procedure_id' => $legacyId, 'type' => 'licencia_confirmada']));
    }

    private function time(string $table, ?int $id, array $where = []): string
    {
        $value = DB::table($table)->when($id, fn ($query) => $query->where('id', $id))->where($where)->value('created_at');

        return Carbon::parse($value)->format('Y-m-d H:i:s');
    }
}
