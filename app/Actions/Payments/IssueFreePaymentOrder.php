<?php

namespace App\Actions\Payments;

use App\Enums\PaymentOrderKind;
use App\Enums\PaymentOrderStatus;
use App\Models\PaymentOrder;
use App\Models\Taxpayer;
use App\Models\Uit;
use App\Support\YearlySequence;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Payment order for concepts outside a procedure (banners, fines, other
 * activities): the old "boletas de otras actividades", now through Caja.
 */
class IssueFreePaymentOrder
{
    /**
     * @param  array{taxpayer_id?: ?int, payer_name?: ?string, payer_document?: ?string, notes?: ?string, items: list<array{description: string, amount: string|float, procedure_type_id?: ?int}>}  $data
     */
    public function handle(array $data, PaymentOrderKind $kind = PaymentOrderKind::Free): PaymentOrder
    {
        $taxpayer = isset($data['taxpayer_id']) ? Taxpayer::find($data['taxpayer_id']) : null;
        $uit = Uit::query()->firstWhere('year', now()->year);

        return DB::transaction(function () use ($data, $kind, $taxpayer, $uit) {
            ['year' => $year, 'sequence' => $sequence] = YearlySequence::next(PaymentOrder::class);

            $items = collect($data['items'])->map(fn (array $item) => [
                'procedure_type_id' => $item['procedure_type_id'] ?? null,
                'description' => $item['description'],
                'uit_percentage' => 0,
                'amount' => number_format((float) $item['amount'], 2, '.', ''),
            ]);

            $order = PaymentOrder::create([
                'kind' => $kind,
                'taxpayer_id' => $taxpayer?->id,
                'payer_name' => $taxpayer?->name ?? $data['payer_name'],
                'payer_document' => $taxpayer?->document_number ?? ($data['payer_document'] ?? null),
                'year' => $year,
                'sequence' => $sequence,
                'code' => sprintf('OP-%d-%05d', $year, $sequence),
                'uit_year' => $uit?->year ?? $year,
                'uit_amount' => $uit?->amount ?? 0,
                'total' => number_format($items->sum(fn (array $item) => (float) $item['amount']), 2, '.', ''),
                'notes' => $data['notes'] ?? null,
                'status' => PaymentOrderStatus::Pending,
                'issued_by' => Auth::id(),
            ]);
            $order->items()->createMany($items->all());

            return $order;
        });
    }
}
