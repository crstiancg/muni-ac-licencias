<?php

use App\Support\DeclaredParties;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Each procedure keeps the applicant and the establishment as declared:
     * correcting them in a procedure no longer changes the taxpayer's record
     * or its other procedures. Existing procedures get today's data, frozen
     * from now on.
     */
    public function up(): void
    {
        Schema::table('procedures', function (Blueprint $table) {
            $table->json('applicant_data')->nullable()->after('establishment_id');
            $table->json('premises_data')->nullable()->after('applicant_data');
        });

        $this->backfill();
    }

    /**
     * Copies the current taxpayer and establishment into procedures that
     * have no copy yet.
     */
    public function backfill(): void
    {
        DB::table('procedures')
            ->whereNull('applicant_data')
            ->select('id', 'taxpayer_id', 'establishment_id')
            ->chunkById(500, function ($procedures) {
                $taxpayers = DB::table('taxpayers')->whereIn('id', $procedures->pluck('taxpayer_id')->unique())->get()->keyBy('id');
                $establishments = DB::table('establishments')->whereIn('id', $procedures->pluck('establishment_id')->unique())->get()->keyBy('id');

                foreach ($procedures as $procedure) {
                    $taxpayer = $taxpayers->get($procedure->taxpayer_id);
                    $establishment = $establishments->get($procedure->establishment_id);

                    if (! $taxpayer || ! $establishment) {
                        continue;
                    }

                    DB::table('procedures')->where('id', $procedure->id)->update([
                        'applicant_data' => json_encode(DeclaredParties::raw((array) $taxpayer, DeclaredParties::TAXPAYER)),
                        'premises_data' => json_encode(DeclaredParties::raw((array) $establishment, DeclaredParties::ESTABLISHMENT)),
                    ]);
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procedures', function (Blueprint $table) {
            $table->dropColumn(['applicant_data', 'premises_data']);
        });
    }
};
