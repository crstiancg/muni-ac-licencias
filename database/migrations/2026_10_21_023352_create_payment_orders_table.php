<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * A payment order freezes the UIT and every amount when issued, so later
     * TUPA or UIT changes never alter what the taxpayer was told to pay.
     */
    public function up(): void
    {
        Schema::create('payment_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('procedure_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('sequence');
            $table->string('code', 20)->unique();

            $table->unsignedSmallInteger('uit_year');
            $table->decimal('uit_amount', 10, 2);
            $table->decimal('total', 10, 2);
            $table->string('status', 20)->default('pendiente');

            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();

            // Caja: receipt (comprobante) the taxpayer paid with.
            $table->string('receipt_number', 50)->nullable();
            $table->date('paid_at')->nullable();
            $table->foreignId('payment_registered_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->unique(['year', 'sequence']);
        });

        Schema::create('payment_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('procedure_type_id')->constrained()->restrictOnDelete();
            $table->string('description');
            $table->decimal('uit_percentage', 7, 4);
            $table->decimal('amount', 10, 2);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_order_items');
        Schema::dropIfExists('payment_orders');
    }
};
