<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Legacy dblicencias had no taxpayer table: name, documents, address and
     * representative were retyped in every lic_tramite row.
     */
    public function up(): void
    {
        Schema::create('taxpayers', function (Blueprint $table) {
            $table->id();
            $table->string('document_type', 3);
            $table->string('document_number', 15);
            // RUC of a natural person (10/15/17). Companies use document_type = ruc.
            $table->char('ruc', 11)->nullable()->unique();
            $table->string('name');
            $table->string('email', 100)->nullable();
            $table->string('phone', 20)->nullable();

            // Domicilio fiscal.
            $table->string('address')->nullable();
            $table->string('district', 60)->nullable();
            $table->string('province', 60)->nullable();
            $table->string('department', 60)->nullable();

            // Legal representative (companies).
            $table->string('representative_name')->nullable();
            $table->string('representative_document', 15)->nullable();
            $table->string('representative_sunarp', 30)->nullable();
            $table->string('representative_phone', 20)->nullable();

            // lic_tramite.tra_ide of the most recent procedure the data was taken from.
            $table->unsignedInteger('legacy_procedure_id')->nullable();

            $table->timestamps();

            $table->unique(['document_type', 'document_number']);
            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('taxpayers');
    }
};
