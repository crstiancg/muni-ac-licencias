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
     * What a procedure does to an existing licence when attended: replace it
     * (transfer, change of activity), close it (temporarily or for good) or
     * reprint it (duplicate). The licence acted on is chosen explicitly.
     */
    public function up(): void
    {
        Schema::table('procedure_types', function (Blueprint $table) {
            $table->string('license_effect', 20)->nullable()->after('validity_months');
        });

        Schema::table('procedures', function (Blueprint $table) {
            $table->foreignId('related_license_id')->nullable()->after('establishment_id')->constrained('licenses')->nullOnDelete();
        });

        Schema::table('licenses', function (Blueprint $table) {
            $table->unsignedTinyInteger('duplicates')->default(0)->after('status_changed_at');
            $table->foreignId('replaced_by_id')->nullable()->after('duplicates')->constrained('licenses')->nullOnDelete();
        });

        foreach ([
            'reemplaza' => ['TRANSFERENCIA%', '%CAMBIO DE GIRO%'],
            'cese' => ['CESE%'],
            'cese_temporal' => ['%CIERRE TEMPORAL%'],
            'duplicado' => ['DUPLICADO%'],
        ] as $effect => $patterns) {
            DB::table('procedure_types')
                ->where(fn ($query) => collect($patterns)->each(fn (string $pattern) => $query->orWhere('name', 'like', $pattern)))
                ->update(['license_effect' => $effect]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('replaced_by_id');
            $table->dropColumn('duplicates');
        });

        Schema::table('procedures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('related_license_id');
        });

        Schema::table('procedure_types', function (Blueprint $table) {
            $table->dropColumn('license_effect');
        });
    }
};
