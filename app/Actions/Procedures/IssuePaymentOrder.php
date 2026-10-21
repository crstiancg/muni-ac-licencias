<?php

namespace App\Actions\Procedures;

use App\Enums\PaymentOrderKind;
use App\Enums\PaymentOrderStatus;
use App\Enums\ProcedureStatus;
use App\Models\PaymentOrder;
use App\Models\Procedure;
use App\Models\ProcedureType;
use App\Models\Uit;
use App\Support\YearlySequence;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Issues the payment order of a registered procedure, freezing each fee with
 * the UIT of the current year. A zero total (exonerated procedures) is
 * settled at once so the procedure can go on.
 */
class IssuePaymentOrder
{
    public function handle(Procedure $procedure): PaymentOrder
    {
        if ($procedure->status !== ProcedureStatus::Registered) {
            throw ValidationException::withMessages(['payment_order' => 'Solo un trámite registrado puede liquidarse.']);
        }

        $uit = Uit::query()->firstWhere('year', now()->year);

        if (! $uit) {
            throw ValidationException::withMessages(['payment_order' => 'Registra la UIT '.now()->year.' antes de emitir órdenes de pago.']);
        }

        return DB::transaction(function () use ($procedure, $uit) {
            ['year' => $year, 'sequence' => $sequence] = YearlySequence::next(PaymentOrder::class);

            $items = $procedure->types->map(fn (ProcedureType $type) => [
                'procedure_type_id' => $type->id,
                'description' => $type->name,
                'uit_percentage' => $type->uit_percentage,
                'amount' => $type->feeFor($uit),
            ]);

            $total = number_format($items->sum(fn (array $item) => (float) $item['amount']), 2, '.', '');
            $exonerated = (float) $total === 0.0;

            $order = PaymentOrder::create([
                'kind' => PaymentOrderKind::Procedure,
                'procedure_id' => $procedure->id,
                'taxpayer_id' => $procedure->taxpayer_id,
                'payer_name' => $procedure->taxpayer->name,
                'payer_document' => $procedure->taxpayer->document_number,
                'year' => $year,
                'sequence' => $sequence,
                'code' => sprintf('OP-%d-%05d', $year, $sequence),
                'uit_year' => $uit->year,
                'uit_amount' => $uit->amount,
                'total' => $total,
                'status' => $exonerated ? PaymentOrderStatus::Paid : PaymentOrderStatus::Pending,
                'issued_by' => Auth::id(),
                'receipt_number' => $exonerated ? 'EXONERADO' : null,
                'paid_at' => $exonerated ? now() : null,
                'payment_registered_by' => $exonerated ? Auth::id() : null,
            ]);
            $order->items()->createMany($items->all());

            $procedure->update(['status' => $exonerated ? ProcedureStatus::Paid : ProcedureStatus::Liquidated]);
            $procedure->log('liquidado', "{$order->code} por S/ {$total} (UIT {$uit->year}: S/ {$uit->amount})");

            if ($exonerated) {
                $procedure->log('pagado', 'Exonerado de pago (monto S/ 0.00).');
            }

            return $order;
        });
    }
}
