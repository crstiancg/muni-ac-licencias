<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * One Caja flow for every charge: procedure fees (tramite), free concepts
     * such as banners or fines (libre, the old "boletas de otras actividades")
     * and market stall fees (mercado). The payer is snapshotted because free
     * and market charges may not have a registered taxpayer.
     */
    public function up(): void
    {
        Schema::table('payment_orders', function (Blueprint $table) {
            $table->string('kind', 20)->default('tramite')->after('code')->index();
            $table->foreignId('procedure_id')->nullable()->change();
            $table->foreignId('taxpayer_id')->nullable()->after('procedure_id')->constrained()->nullOnDelete();
            $table->string('payer_name')->nullable()->after('taxpayer_id');
            $table->string('payer_document', 20)->nullable()->after('payer_name');
            $table->text('notes')->nullable()->after('total');
        });

        Schema::table('payment_order_items', function (Blueprint $table) {
            $table->foreignId('procedure_type_id')->nullable()->change();
        });

        // Existing orders belong to procedures: snapshot their payer.
        DB::table('payment_orders')
            ->join('procedures', 'procedures.id', '=', 'payment_orders.procedure_id')
            ->join('taxpayers', 'taxpayers.id', '=', 'procedures.taxpayer_id')
            ->update([
                'payment_orders.taxpayer_id' => DB::raw('taxpayers.id'),
                'payment_orders.payer_name' => DB::raw('taxpayers.name'),
                'payment_orders.payer_document' => DB::raw('taxpayers.document_number'),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('taxpayer_id');
            $table->dropColumn(['kind', 'payer_name', 'payer_document', 'notes']);
        });
    }
};
