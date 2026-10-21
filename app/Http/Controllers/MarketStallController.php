<?php

namespace App\Http\Controllers;

use App\Actions\Markets\BillMarketCharges;
use App\Models\Market;
use App\Models\MarketCharge;
use App\Models\MarketStall;
use App\Models\Taxpayer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MarketStallController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('markets/stalls/form', [
            'stall' => null,
            'marketId' => $request->integer('market') ?: null,
            ...$this->options(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $stall = MarketStall::create($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => "Puesto {$stall->code} registrado."]);

        return to_route('market-stalls.show', $stall);
    }

    /**
     * The stall's file: holder, fee and charges, from which unpaid charges
     * are billed into a payment order.
     */
    public function show(MarketStall $marketStall): Response
    {
        $marketStall->load('market', 'taxpayer:id,name,document_type,document_number');

        return Inertia::render('markets/stalls/show', [
            'stall' => [
                ...$marketStall->toArray(),
                'status_label' => MarketStall::STATUSES[$marketStall->status] ?? $marketStall->status,
                'type_label' => MarketStall::TYPES[$marketStall->stall_type] ?? null,
            ],
            'charges' => $marketStall->charges()->with('paymentOrder:id,code,status')->get()->map(fn (MarketCharge $charge) => [
                ...$charge->only('id', 'amount', 'paid_at', 'receipt_number'),
                'period' => $charge->periodLabel(),
                'order' => $charge->paymentOrder?->only('id', 'code'),
            ]),
            'debt' => number_format((float) $marketStall->pendingCharges()->sum('amount'), 2, '.', ''),
        ]);
    }

    public function edit(MarketStall $marketStall): Response
    {
        return Inertia::render('markets/stalls/form', [
            'stall' => $marketStall->load('taxpayer:id,document_type,document_number,ruc,name,address'),
            'marketId' => $marketStall->market_id,
            ...$this->options(),
        ]);
    }

    public function update(Request $request, MarketStall $marketStall): RedirectResponse
    {
        $marketStall->update($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => "Puesto {$marketStall->code} actualizado."]);

        return to_route('market-stalls.show', $marketStall);
    }

    /**
     * Bill the chosen unpaid charges into one payment order.
     */
    public function bill(Request $request, MarketStall $marketStall, BillMarketCharges $bill): RedirectResponse
    {
        $data = $request->validate([
            'charge_ids' => ['required', 'array', 'min:1'],
            'charge_ids.*' => ['integer'],
        ], ['charge_ids.required' => 'Elige al menos una cuota.']);

        $order = $bill->handle($marketStall, array_map('intval', $data['charge_ids']));

        Inertia::flash('toast', ['type' => 'success', 'message' => "Orden de pago {$order->code} emitida por S/ {$order->total}."]);

        return to_route('payment-orders.show', $order);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'market_id' => ['required', 'integer', Rule::exists(Market::class, 'id')],
            'code' => ['required', 'string', 'max:50'],
            'stall_type' => ['nullable', Rule::in(array_keys(MarketStall::TYPES))],
            'activity' => ['nullable', 'string', 'max:150'],
            'fee' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:999999.99'],
            'taxpayer_id' => ['nullable', 'integer', Rule::exists(Taxpayer::class, 'id')],
            'holder_name' => ['nullable', 'string', 'max:255'],
            'holder_document' => ['nullable', 'string', 'max:20'],
            'status' => ['required', Rule::in(array_keys(MarketStall::STATUSES))],
            'notes' => ['nullable', 'string', 'max:500'],
        ], attributes: [
            'market_id' => 'mercado', 'code' => 'N° de puesto', 'stall_type' => 'tipo', 'activity' => 'giro',
            'fee' => 'cuota', 'holder_name' => 'titular', 'holder_document' => 'documento', 'status' => 'estado', 'notes' => 'observaciones',
        ]);

        // A registered taxpayer is the source of the holder's name.
        if ($taxpayer = isset($data['taxpayer_id']) ? Taxpayer::find($data['taxpayer_id']) : null) {
            $data['holder_name'] = $taxpayer->name;
            $data['holder_document'] = $taxpayer->document_number;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function options(): array
    {
        return [
            'markets' => Market::query()->orderBy('name')->get(['id', 'name', 'payment_frequency'])
                ->map(fn (Market $market) => ['value' => (string) $market->id, 'label' => "{$market->name} ({$market->payment_frequency})"]),
            'types' => collect(MarketStall::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'statuses' => collect(MarketStall::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ];
    }
}
