<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Observations printed on the licence, saved when issuing so a later
     * change of the standard text never alters it. Null on imported
     * licences: they print the standard text.
     */
    public function up(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->string('observations', 300)->nullable()->after('risk_level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->dropColumn('observations');
        });
    }
};
