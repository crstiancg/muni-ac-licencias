<?php

namespace App\Http\Controllers;

use App\Actions\Payments\IssueFreePaymentOrder;
use App\Actions\Procedures\RegisterPayment;
use App\Enums\PaymentOrderKind;
use App\Enums\PaymentOrderStatus;
use App\Models\PaymentOrder;
use App\Models\ProcedureType;
use App\Models\Taxpayer;
use App\Models\Uit;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * Caja: every payment order (procedures, other concepts, markets) in one
 * place, plus free orders for concepts outside a procedure.
 */
class PaymentOrderController extends Controller
{
    /**
     * Query string: ?filter[search]=&filter[kind]=&filter[status]=&page=
     */
    public function index(Request $request): Response
    {
        $orders = QueryBuilder::for(PaymentOrder::class)
            ->with('procedure:id,code')
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::exact('kind'),
                AllowedFilter::exact('status'),
            )
            ->defaultSort('-id')
            ->paginate(15)
            ->onEachSide(1)
            ->withQueryString();

        return Inertia::render('payment-orders/index', [
            'orders' => $orders->through(fn (PaymentOrder $order) => $this->row($order)),
            'filters' => [
                'search' => $request->input('filter.search'),
                'kind' => $request->input('filter.kind'),
                'status' => $request->input('filter.status', null),
            ],
            'kinds' => PaymentOrderKind::options(),
            'statuses' => array_map(fn (PaymentOrderStatus $status) => ['value' => $status->value, 'label' => $status->label()], PaymentOrderStatus::cases()),
        ]);
    }

    /**
     * Form for a free payment order (banners, fines, other activities).
     */
    public function create(Request $request): Response
    {
        $uit = Uit::query()->firstWhere('year', now()->year);

        return Inertia::render('payment-orders/create', [
            'taxpayer' => $request->integer('taxpayer')
                ? Taxpayer::query()->find($request->integer('taxpayer'), ['id', 'document_type', 'document_number', 'ruc', 'name', 'address'])
                : null,
            // TUPA concepts can prefill a line with their fee.
            'concepts' => ProcedureType::query()
                ->where('is_active', true)
                ->orderBy('position')
                ->get(['id', 'name', 'uit_percentage'])
                ->map(fn (ProcedureType $type) => [
                    'id' => $type->id,
                    'name' => $type->name,
                    'fee' => $uit ? $type->feeFor($uit) : null,
                ]),
        ]);
    }

    public function store(Request $request, IssueFreePaymentOrder $issue): RedirectResponse
    {
        $data = $request->validate([
            'taxpayer_id' => ['nullable', 'integer', Rule::exists(Taxpayer::class, 'id')],
            'payer_name' => ['required_without:taxpayer_id', 'nullable', 'string', 'max:255'],
            'payer_document' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.amount' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:999999.99'],
            'items.*.procedure_type_id' => ['nullable', 'integer', Rule::exists(ProcedureType::class, 'id')],
        ], [
            'payer_name.required_without' => 'Elige un contribuyente o escribe el nombre de quien paga.',
            'items.required' => 'Agrega al menos un concepto.',
        ], [
            'payer_name' => 'nombre de quien paga',
            'payer_document' => 'documento',
            'notes' => 'observaciones',
            'items.*.description' => 'concepto',
            'items.*.amount' => 'importe',
        ]);

        $order = $issue->handle($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Orden de pago {$order->code} emitida por S/ {$order->total}."]);

        return to_route('payment-orders.show', $order);
    }

    public function show(PaymentOrder $paymentOrder): Response
    {
        $paymentOrder->load('items', 'procedure:id,code', 'issuedBy:id,name');

        return Inertia::render('payment-orders/show', [
            'order' => [
                ...$this->row($paymentOrder),
                ...$paymentOrder->only('notes', 'uit_year', 'uit_amount', 'taxpayer_id'),
                'items' => $paymentOrder->items->map->only('id', 'description', 'amount'),
                'issued_by' => $paymentOrder->issuedBy?->name,
            ],
        ]);
    }

    /**
     * Printable payment order (any kind).
     */
    public function print(PaymentOrder $paymentOrder): View
    {
        return view('print.payment-order', [
            'order' => $paymentOrder->load('items', 'issuedBy:id,name', 'procedure.establishment'),
        ]);
    }

    /**
     * Record the Caja receipt.
     */
    public function registerPayment(Request $request, PaymentOrder $paymentOrder, RegisterPayment $register): RedirectResponse
    {
        $data = $request->validate([
            'receipt_number' => ['required', 'string', 'max:50'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
        ], attributes: ['receipt_number' => 'N° de comprobante', 'paid_at' => 'fecha de pago']);

        $register->handle($paymentOrder, $data['receipt_number'], $data['paid_at']);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pago de la orden {$paymentOrder->code} registrado."]);

        return back();
    }

    /**
     * Cancel a pending order outside a procedure (procedure orders are
     * cancelled with their procedure).
     */
    public function cancel(PaymentOrder $paymentOrder): RedirectResponse
    {
        if ($paymentOrder->status !== PaymentOrderStatus::Pending || $paymentOrder->procedure_id) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "La orden {$paymentOrder->code} no se puede anular aquí."]);

            return back();
        }

        DB::transaction(function () use ($paymentOrder) {
            $paymentOrder->update(['status' => PaymentOrderStatus::Cancelled]);
            // Market fees billed in this order become payable again.
            DB::table('market_charges')->where('payment_order_id', $paymentOrder->id)->update(['payment_order_id' => null]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Orden {$paymentOrder->code} anulada."]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function row(PaymentOrder $order): array
    {
        return [
            ...$order->only('id', 'code', 'payer_name', 'payer_document', 'total', 'receipt_number', 'paid_at', 'created_at'),
            'kind' => $order->kind->value,
            'kind_label' => $order->kind->label(),
            'status' => $order->status->value,
            'status_label' => $order->status->label(),
            'procedure' => $order->procedure?->only('id', 'code'),
        ];
    }
}
