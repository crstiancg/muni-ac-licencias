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
     * Which document a procedure type ends in (licence or sign authorization).
     * Types already imported from dblicencias are classified by name.
     */
    public function up(): void
    {
        Schema::table('procedure_types', function (Blueprint $table) {
            $table->string('document_type', 20)->nullable()->after('risk_level');
        });

        DB::table('procedure_types')
            ->where(fn ($query) => $query->where('name', 'like', 'LICENCIA%')->orWhere('name', 'like', 'TRANSFERENCIA%'))
            ->update(['document_type' => 'licencia']);

        DB::table('procedure_types')
            ->whereNull('document_type')
            ->where('name', 'like', '%ANUNCIO%')
            ->update(['document_type' => 'anuncio']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('procedure_types', function (Blueprint $table) {
            $table->dropColumn('document_type');
        });
    }
};
