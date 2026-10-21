<?php

namespace App\Http\Controllers;

use App\Actions\Markets\GenerateMarketCharges;
use App\Models\Market;
use App\Models\MarketCharge;
use App\Models\MarketStall;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class MarketController extends Controller
{
    /**
     * Markets with their stalls and outstanding debt.
     */
    public function index(): Response
    {
        $debts = MarketCharge::query()
            ->whereNull('paid_at')
            ->join('market_stalls', 'market_stalls.id', '=', 'market_charges.market_stall_id')
            ->selectRaw('market_stalls.market_id, sum(market_charges.amount) as debt')
            ->groupBy('market_stalls.market_id')
            ->pluck('debt', 'market_id');

        return Inertia::render('markets/index', [
            'markets' => Market::query()
                ->withCount(['stalls', 'stalls as active_stalls_count' => fn ($query) => $query->where('status', 'activo')])
                ->orderBy('name')
                ->get()
                ->map(fn (Market $market) => [
                    ...$market->toArray(),
                    'debt' => number_format((float) ($debts[$market->id] ?? 0), 2, '.', ''),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $market = Market::create($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => "Mercado {$market->name} registrado."]);

        return back();
    }

    public function update(Request $request, Market $market): RedirectResponse
    {
        $market->update($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => "Mercado {$market->name} actualizado."]);

        return back();
    }

    /**
     * Stalls of the market with their debt.
     *
     * Query string: ?filter[search]=&filter[status]=&filter[debt]=1&page=
     */
    public function show(Request $request, Market $market): Response
    {
        $stalls = QueryBuilder::for(MarketStall::class)
            ->where('market_id', $market->id)
            ->withSum('pendingCharges as debt', 'amount')
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::exact('status'),
                AllowedFilter::callback('debt', fn ($query, $value) => $value ? $query->has('pendingCharges') : null),
            )
            ->orderBy('code')
            ->paginate(20)
            ->onEachSide(1)
            ->withQueryString();

        return Inertia::render('markets/show', [
            'market' => $market,
            'stalls' => $stalls,
            'filters' => [
                'search' => $request->input('filter.search'),
                'status' => $request->input('filter.status'),
                'debt' => (bool) $request->input('filter.debt'),
            ],
            'statuses' => collect(MarketStall::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    /**
     * Create the period's charges for every active stall with a fee.
     */
    public function generateCharges(Request $request, Market $market, GenerateMarketCharges $generate): RedirectResponse
    {
        $data = $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:'.(now()->year + 1)],
            'month' => [$market->isMonthly() ? 'required' : 'nullable', 'integer', 'min:1', 'max:12'],
        ], attributes: ['year' => 'año', 'month' => 'mes']);

        $created = $generate->handle($market, $data['year'], $data['month'] ?? null);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$created} cuotas generadas en {$market->name}."]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'payment_frequency' => ['required', Rule::in(['anual', 'mensual'])],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ], attributes: ['name' => 'nombre', 'payment_frequency' => 'frecuencia de pago', 'address' => 'dirección']);
    }
}
