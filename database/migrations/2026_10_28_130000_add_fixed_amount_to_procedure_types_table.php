<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Some TUPA fees are a fixed amount in soles instead of a share of the
     * UIT of the year. Payment order items of a fixed fee keep no percentage.
     */
    public function up(): void
    {
        Schema::table('procedure_types', function (Blueprint $table) {
            $table->decimal('fixed_amount', 10, 2)->nullable()->after('uit_percentage');
        });

        Schema::table('payment_order_items', function (Blueprint $table) {
            $table->decimal('uit_percentage', 7, 4)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_order_items', function (Blueprint $table) {
            $table->decimal('uit_percentage', 7, 4)->nullable(false)->change();
        });

        Schema::table('procedure_types', function (Blueprint $table) {
            $table->dropColumn('fixed_amount');
        });
    }
};
