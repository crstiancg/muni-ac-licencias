<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Months the issued document is valid for; null means indefinite (the
     * rule for operating licences, Ley 28976 art. 11). Provisional licences
     * for bodegas last 12 months (Ley 30877).
     */
    public function up(): void
    {
        Schema::table('procedure_types', function (Blueprint $table) {
            $table->unsignedSmallInteger('validity_months')->nullable()->after('document_type');
        });

        DB::table('procedure_types')
            ->where('name', 'like', '%PROVISIONAL%BODEGA%')
            ->update(['validity_months' => 12]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procedure_types', function (Blueprint $table) {
            $table->dropColumn('validity_months');
        });
    }
};
