<?php

namespace App\Http\Controllers;

use App\Enums\PaymentOrderStatus;
use App\Models\PaymentOrder;
use App\Models\PaymentOrderItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RevenueReportController extends Controller
{
    /**
     * Revenue of paid payment orders between ?from= and ?to= (current month
     * by default), by procedure type and by day.
     */
    public function index(Request $request): Response
    {
        [$from, $to] = $this->range($request);
        $paid = $this->paidOrders($from, $to);

        $byType = PaymentOrderItem::query()
            ->whereIn('payment_order_id', (clone $paid)->select('id'))
            ->selectRaw('description, count(*) as quantity, sum(amount) as total')
            ->groupBy('description')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'description' => $row->description,
                'quantity' => (int) $row->quantity,
                'total' => number_format((float) $row->total, 2, '.', ''),
            ]);

        $byDay = (clone $paid)
            ->selectRaw('paid_at, count(*) as quantity, sum(total) as total')
            ->groupBy('paid_at')
            ->orderBy('paid_at')
            ->get()
            ->map(fn ($row) => [
                'date' => $row->paid_at->toDateString(),
                'quantity' => (int) $row->quantity,
                'total' => number_format((float) $row->total, 2, '.', ''),
            ]);

        return Inertia::render('reports/revenue', [
            'filters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => [
                'total' => number_format((float) (clone $paid)->sum('total'), 2, '.', ''),
                'orders' => (clone $paid)->where('total', '>', 0)->count(),
                'exonerated' => (clone $paid)->where('total', 0)->count(),
                'pending' => number_format((float) PaymentOrder::query()->where('status', PaymentOrderStatus::Pending)->sum('total'), 2, '.', ''),
            ],
            'byType' => $byType,
            'byDay' => $byDay,
        ]);
    }

    /**
     * Paid orders of the range as CSV (one row per order) for Excel.
     */
    public function export(Request $request): StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $orders = $this->paidOrders($from, $to)->with('procedure:id,code', 'items')->orderBy('paid_at');

        return response()->streamDownload(function () use ($orders) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Fecha de pago', 'Comprobante', 'Orden', 'Trámite / tipo', 'Contribuyente', 'Documento', 'Conceptos', 'Total S/'], ';');

            $orders->lazy(500)->each(function (PaymentOrder $order) use ($out) {
                fputcsv($out, [
                    $order->paid_at?->format('d/m/Y'),
                    $order->receipt_number,
                    $order->code,
                    $order->procedure?->code ?? $order->kind->label(),
                    $order->payer_name,
                    $order->payer_document,
                    $order->items->pluck('description')->join(' | '),
                    $order->total,
                ], ';');
            });

            fclose($out);
        }, "recaudacion-{$from->format('Ymd')}-{$to->format('Ymd')}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function range(Request $request): array
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return [
            Carbon::parse($validated['from'] ?? now()->startOfMonth())->startOfDay(),
            Carbon::parse($validated['to'] ?? now())->endOfDay(),
        ];
    }

    /**
     * @return Builder<PaymentOrder>
     */
    private function paidOrders(Carbon $from, Carbon $to): Builder
    {
        return PaymentOrder::query()
            ->where('status', PaymentOrderStatus::Paid)
            ->whereBetween('paid_at', [$from->toDateString(), $to->toDateString()]);
    }
}
