<?php

namespace App\Actions\Markets;

use App\Actions\Payments\IssueFreePaymentOrder;
use App\Enums\PaymentOrderKind;
use App\Models\MarketCharge;
use App\Models\MarketStall;
use App\Models\PaymentOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Issues one payment order (kind mercado) for the chosen unpaid charges of a
 * stall. Paying it in Caja settles them (see RegisterPayment).
 */
class BillMarketCharges
{
    public function __construct(private IssueFreePaymentOrder $issue) {}

    /**
     * @param  list<int>  $chargeIds
     */
    public function handle(MarketStall $stall, array $chargeIds): PaymentOrder
    {
        $charges = $stall->pendingCharges()
            ->whereIn('id', $chargeIds)
            ->whereNull('payment_order_id')
            ->orderBy('period_year')
            ->orderBy('period_month')
            ->get();

        if ($charges->isEmpty() || $charges->count() !== count($chargeIds)) {
            throw ValidationException::withMessages(['charges' => 'Elige cuotas pendientes que aún no tengan orden de pago.']);
        }

        if (! $stall->taxpayer_id && ! $stall->holder_name) {
            throw ValidationException::withMessages(['charges' => 'Registra al titular del puesto antes de emitir la orden.']);
        }

        $stall->loadMissing('market', 'taxpayer');

        return DB::transaction(function () use ($stall, $charges) {
            $order = $this->issue->handle([
                'taxpayer_id' => $stall->taxpayer_id,
                'payer_name' => $stall->holder_name,
                'payer_document' => $stall->holder_document,
                'notes' => "Mercado {$stall->market->name}, puesto {$stall->code}.",
                'items' => $charges->map(fn (MarketCharge $charge) => [
                    'description' => "Mercado {$stall->market->name} · puesto {$stall->code} · cuota {$charge->periodLabel()}",
                    'amount' => $charge->amount,
                ])->all(),
            ], PaymentOrderKind::Market);

            MarketCharge::query()->whereKey($charges->modelKeys())->update(['payment_order_id' => $order->id]);

            return $order;
        });
    }
}
