<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The applicant's address as the sworn declaration asks it (boxes 14
     * to 16): street in `address`, then number, interior, block, lot and
     * the urbanization or settlement.
     */
    public function up(): void
    {
        Schema::table('taxpayers', function (Blueprint $table) {
            $table->string('number', 20)->nullable()->after('address');
            $table->string('interior', 20)->nullable()->after('number');
            $table->string('block', 10)->nullable()->after('interior');
            $table->string('lot', 10)->nullable()->after('block');
            $table->string('settlement', 100)->nullable()->after('lot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('taxpayers', function (Blueprint $table) {
            $table->dropColumn(['number', 'interior', 'block', 'lot', 'settlement']);
        });
    }
};
