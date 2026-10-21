<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Replaces dblicencias.lic_tramite: the applicant and the establishment
     * are referenced instead of retyped, and the requested types live in a
     * pivot instead of a "36,46," string.
     */
    public function up(): void
    {
        Schema::create('procedures', function (Blueprint $table) {
            $table->id();
            // Human code per year: 2026-00001.
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('sequence');
            $table->string('code', 20)->unique();

            $table->foreignId('taxpayer_id')->constrained()->restrictOnDelete();
            $table->foreignId('establishment_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('registrado')->index();

            // Mesa de partes.
            $table->string('file_number', 50)->nullable();
            $table->unsignedSmallInteger('folios')->nullable();
            $table->text('notes')->nullable();

            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason', 500)->nullable();

            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();

            // dblicencias.lic_tramite.tra_ide for imported history.
            $table->unsignedInteger('legacy_id')->nullable()->unique();

            $table->timestamps();

            $table->unique(['year', 'sequence']);
        });

        Schema::create('procedure_procedure_type', function (Blueprint $table) {
            $table->foreignId('procedure_id')->constrained()->cascadeOnDelete();
            $table->foreignId('procedure_type_id')->constrained()->restrictOnDelete();

            $table->primary(['procedure_id', 'procedure_type_id']);
        });

        Schema::create('procedure_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('procedure_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 30);
            $table->text('description')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('procedure_events');
        Schema::dropIfExists('procedure_procedure_type');
        Schema::dropIfExists('procedures');
    }
};
