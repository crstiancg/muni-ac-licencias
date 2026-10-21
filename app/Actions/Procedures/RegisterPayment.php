<?php

namespace App\Actions\Procedures;

use App\Enums\PaymentOrderStatus;
use App\Enums\ProcedureStatus;
use App\Models\MarketCharge;
use App\Models\PaymentOrder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Records that a payment order was paid in Caja (receipt number and date)
 * and settles what it paid for: the procedure, or nothing more for free
 * concepts. Market stall fees are settled through their payment_order_id.
 */
class RegisterPayment
{
    public function handle(PaymentOrder $order, string $receiptNumber, string $paidAt): void
    {
        if ($order->status !== PaymentOrderStatus::Pending) {
            throw ValidationException::withMessages(['receipt_number' => 'La orden de pago no está pendiente.']);
        }

        DB::transaction(function () use ($order, $receiptNumber, $paidAt) {
            $order->update([
                'status' => PaymentOrderStatus::Paid,
                'receipt_number' => $receiptNumber,
                'paid_at' => $paidAt,
                'payment_registered_by' => Auth::id(),
            ]);

            if ($order->procedure) {
                $order->procedure->update(['status' => ProcedureStatus::Paid]);
                $order->procedure->log('pagado', "Comprobante {$receiptNumber} del {$order->paid_at->format('d/m/Y')} ({$order->code}).");
            }

            // Market stall fees billed in this order.
            MarketCharge::query()
                ->where('payment_order_id', $order->id)
                ->update(['paid_at' => $paidAt, 'receipt_number' => $receiptNumber]);
        });
    }
}
