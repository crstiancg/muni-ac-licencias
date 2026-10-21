<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Documents issued at the end of a procedure: operating licences and sign
     * authorizations. Holder, activity and address are snapshotted so the
     * printed document and its public QR verification always agree.
     */
    public function up(): void
    {
        Schema::create('licenses', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('sequence')->nullable();
            $table->string('number', 30);

            $table->foreignId('procedure_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('taxpayer_id')->constrained()->restrictOnDelete();
            $table->foreignId('establishment_id')->constrained()->restrictOnDelete();

            $table->date('issued_at');
            $table->date('valid_until')->nullable();
            $table->string('status', 20)->default('vigente')->index();
            $table->string('status_reason', 500)->nullable();
            $table->timestamp('status_changed_at')->nullable();

            // Public verification: {APP_URL}/v/{qr_token}.
            $table->string('qr_token', 16)->unique();

            // Snapshot at issue time.
            $table->string('holder_name');
            $table->string('holder_document', 20);
            $table->string('trade_name', 150)->nullable();
            $table->string('activity');
            $table->string('address');
            $table->decimal('area', 10, 2)->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->string('risk_level', 20)->nullable();

            // Sign authorizations.
            $table->string('sign_kind', 20)->nullable();
            $table->unsignedTinyInteger('sign_faces')->nullable();
            $table->string('sign_material', 100)->nullable();
            $table->decimal('sign_width', 6, 2)->nullable();
            $table->decimal('sign_height', 6, 2)->nullable();

            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();

            // dblicencias.lic_licencia.lic_ide for imported licences.
            $table->unsignedInteger('legacy_id')->nullable()->unique();

            $table->timestamps();

            $table->unique(['type', 'year', 'sequence']);
            $table->index('number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};
