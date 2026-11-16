<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Follow-up of a business found working without a licence: notified
     * with a deadline, revisited, and closed when it gets one (or sent to
     * sanction). Its visits point to it.
     */
    public function up(): void
    {
        Schema::create('inspection_cases', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('sequence');
            $table->string('code', 20)->unique();
            $table->string('status', 20)->default('pendiente');
            $table->string('business_name');
            $table->string('holder_name')->nullable();
            $table->string('holder_document', 20)->nullable();
            // The DNI inside a RUC 10, or the document as is: to match the licence later.
            $table->string('document_key', 20)->nullable()->index();
            $table->string('address');
            $table->string('activity')->nullable();
            $table->string('notice_number', 30)->nullable();
            $table->date('notified_at')->nullable();
            $table->date('deadline')->nullable();
            $table->foreignId('license_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->string('resolution_note', 500)->nullable();
            $table->foreignId('opened_by')->constrained('users');
            $table->foreignId('resolved_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->unique(['year', 'sequence']);
            $table->index(['status', 'deadline']);
        });

        Schema::table('inspections', function (Blueprint $table) {
            $table->foreignId('inspection_case_id')->nullable()->after('establishment_id')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inspection_case_id');
        });

        Schema::dropIfExists('inspection_cases');
    }
};
