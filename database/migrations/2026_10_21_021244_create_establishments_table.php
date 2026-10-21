<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Legacy dblicencias retyped the establishment (tra_est_*, tra_actividad)
     * in every lic_tramite row, like the taxpayer.
     */
    public function up(): void
    {
        Schema::create('establishments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('taxpayer_id')->constrained()->restrictOnDelete();
            $table->string('trade_name', 150)->nullable();
            $table->string('activity');
            $table->string('economic_sector', 20)->nullable();

            // Address in Puno.
            $table->string('street_type', 10)->nullable();
            $table->string('street', 150);
            $table->string('number', 20)->nullable();
            $table->string('interior', 20)->nullable();
            $table->string('block', 10)->nullable();
            $table->string('lot', 10)->nullable();
            $table->string('settlement_type', 30)->nullable();
            $table->string('settlement_name', 100)->nullable();

            $table->decimal('area', 10, 2)->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->string('risk_level', 20)->nullable();

            // dblicencias: pre-2018 ITSE type (B EX POST, B EX ANT, D, M) and
            // the most recent lic_tramite.tra_ide the data was taken from.
            $table->string('legacy_itse_type', 10)->nullable();
            $table->unsignedInteger('legacy_procedure_id')->nullable();

            $table->timestamps();

            $table->index('trade_name');
            $table->index('street');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('establishments');
    }
};
