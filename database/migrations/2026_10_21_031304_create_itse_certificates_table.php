<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Certificados de Inspección Técnica de Seguridad en Edificaciones
     * (D.S. N° 002-2018-PCM): valid for 2 years. High and very high risk
     * establishments need it before the licence is granted.
     */
    public function up(): void
    {
        Schema::create('itse_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('establishment_id')->constrained()->restrictOnDelete();
            $table->foreignId('procedure_id')->nullable()->constrained()->nullOnDelete();
            $table->string('number', 30)->unique();
            $table->string('risk_level', 20);
            // previa (before the licence) or posterior, derived from the risk level.
            $table->string('inspection_timing', 10);
            $table->date('inspected_at')->nullable();
            $table->date('issued_at');
            $table->date('valid_until');
            $table->string('inspector', 150)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('vigente');
            $table->string('status_reason', 500)->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['establishment_id', 'valid_until']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('itse_certificates');
    }
};
