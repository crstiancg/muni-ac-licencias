<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * A duplicate is printed on a new pre-printed form as a new licence, and
     * the previous one is replaced so the lost paper no longer verifies.
     */
    public function up(): void
    {
        DB::table('procedure_types')
            ->where('license_effect', 'duplicado')
            ->whereNull('document_type')
            ->update(['document_type' => 'licencia']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('procedure_types')
            ->where('license_effect', 'duplicado')
            ->where('document_type', 'licencia')
            ->update(['document_type' => null]);
    }
};
