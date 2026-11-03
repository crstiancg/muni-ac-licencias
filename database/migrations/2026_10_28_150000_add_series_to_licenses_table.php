<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Series of the pre-printed form the document is printed on. Required
     * when issuing; nullable because imported licences don't have it.
     */
    public function up(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->string('series', 30)->nullable()->after('number');
            $table->unique(['type', 'series']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->dropUnique(['type', 'series']);
            $table->dropColumn('series');
        });
    }
};
