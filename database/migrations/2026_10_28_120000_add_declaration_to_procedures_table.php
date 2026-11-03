<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The applicant's sworn declaration (DJ) as answered when the procedure
     * was registered: dimensions, ITSE safety measures and the sign. Kept on
     * the procedure, not the establishment, so a DJ reprints as it was signed.
     */
    public function up(): void
    {
        Schema::table('procedures', function (Blueprint $table) {
            $table->json('declaration')->nullable()->after('related_license_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procedures', function (Blueprint $table) {
            $table->dropColumn('declaration');
        });
    }
};
