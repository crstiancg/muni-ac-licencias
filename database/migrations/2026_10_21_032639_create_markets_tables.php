<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Municipal markets: stalls rented to merchants who pay a fee per period
     * (yearly or monthly depending on the market). Each period owed is a
     * charge; charges are paid through a payment order of kind "mercado".
     */
    public function up(): void
    {
        Schema::create('markets', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('payment_frequency', 10); // anual | mensual
            $table->string('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->timestamps();
        });

        Schema::create('market_stalls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_id')->constrained()->restrictOnDelete();
            $table->string('code', 50);
            $table->string('stall_type', 20)->nullable();
            $table->string('activity', 150)->nullable();
            // Fee per period of the market (year or month); null = not set yet.
            $table->decimal('fee', 10, 2)->nullable();
            $table->foreignId('taxpayer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('holder_name')->nullable();
            $table->string('holder_document', 20)->nullable();
            $table->string('status', 20)->default('activo'); // activo | abandonado | inactivo
            $table->string('notes', 500)->nullable();
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->timestamps();

            $table->index(['market_id', 'code']);
        });

        Schema::create('market_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('market_stall_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('period_year');
            // Null for yearly markets.
            $table->unsignedTinyInteger('period_month')->nullable();
            $table->decimal('amount', 10, 2);
            $table->foreignId('payment_order_id')->nullable()->constrained()->nullOnDelete();
            $table->date('paid_at')->nullable();
            $table->string('receipt_number', 50)->nullable();
            // dblicencias mer_alquileres.alq_ide for imported payments.
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->timestamps();

            $table->unique(['market_stall_id', 'period_year', 'period_month']);
            $table->index('paid_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('market_charges');
        Schema::dropIfExists('market_stalls');
        Schema::dropIfExists('markets');
    }
};
