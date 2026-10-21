<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Merges legacy lic_tipo_tramite (what is requested) and lic_tipo_orden
     * (its TUPA price), which shared ids and names. The fee is never stored:
     * it is uit_percentage of the UIT in force for the year.
     */
    public function up(): void
    {
        Schema::create('procedure_types', function (Blueprint $table) {
            $table->id();
            $table->string('tupa_code', 20)->nullable()->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('uit_percentage', 7, 4);
            $table->string('risk_level', 20)->nullable();
            $table->unsignedSmallInteger('processing_days')->nullable();
            $table->string('legal_basis', 150)->nullable();
            $table->unsignedSmallInteger('position')->default(0)->index();
            $table->boolean('is_active')->default(true)->index();

            // Traceability with dblicencias: tit_ide / tor_ide and tor_monto (fixed S/ it charged).
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->decimal('legacy_amount', 10, 2)->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('procedure_types');
    }
};
