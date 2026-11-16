<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * The visit that confirmed an imported licence is still in force.
     */
    public function up(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            $table->boolean('confirmed_license')->default(false)->after('license_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            $table->dropColumn('confirmed_license');
        });
    }
};
