<?php

namespace App\Http\Controllers;

use App\Enums\EconomicSector;
use App\Enums\RiskLevel;
use App\Enums\SettlementType;
use App\Enums\StreetType;
use App\Http\Requests\EstablishmentRequest;
use App\Models\Establishment;
use App\Models\Taxpayer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class EstablishmentController extends Controller
{
    /**
     * Display the establishments with their owner, paginated on the server.
     *
     * Query string: ?filter[search]=&sort=trade_name|activity|street|area (prefix - for desc)&page=
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $establishments = QueryBuilder::for(Establishment::class)
            ->with('taxpayer:id,document_type,document_number,ruc,name')
            ->allowedFilters(AllowedFilter::scope('search')->delimiter(''))
            ->allowedSorts('trade_name', 'activity', 'street', 'area')
            ->defaultSort('-id')
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        if ($establishments->isEmpty() && $establishments->currentPage() > 1) {
            return to_route('establishments.index', [
                ...$request->query(),
                'page' => max($establishments->lastPage(), 1),
            ]);
        }

        return Inertia::render('establishments/index', [
            'establishments' => $establishments,
            'filters' => [
                'search' => $request->input('filter.search'),
                'sort' => $request->input('sort', '-id'),
            ],
        ]);
    }

    /**
     * Show the form to register an establishment, optionally for a given
     * taxpayer (?taxpayer=id, e.g. from the taxpayer's file).
     */
    public function create(Request $request): Response
    {
        return Inertia::render('establishments/create', [
            'taxpayer' => $request->integer('taxpayer')
                ? Taxpayer::query()->find($request->integer('taxpayer'), ['id', 'document_type', 'document_number', 'ruc', 'name', 'address'])
                : null,
            'options' => $this->options(),
        ]);
    }

    /**
     * Store a newly registered establishment and go to its owner's file.
     */
    public function store(EstablishmentRequest $request): RedirectResponse
    {
        $establishment = Establishment::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Establecimiento en {$establishment->full_address} registrado."]);

        return to_route('taxpayers.show', $establishment->taxpayer_id);
    }

    /**
     * Show the form to edit the given establishment.
     */
    public function edit(Establishment $establishment): Response
    {
        return Inertia::render('establishments/edit', [
            'establishment' => $establishment->load('taxpayer:id,document_type,document_number,ruc,name,address'),
            'options' => $this->options(),
        ]);
    }

    /**
     * Update the given establishment.
     */
    public function update(EstablishmentRequest $request, Establishment $establishment): RedirectResponse
    {
        $establishment->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Establecimiento actualizado.']);

        return to_route('taxpayers.show', $establishment->taxpayer_id);
    }

    /**
     * Delete the given establishment.
     */
    public function destroy(Establishment $establishment): RedirectResponse
    {
        $establishment->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Establecimiento eliminado.']);

        return back();
    }

    /**
     * Select options for the establishment form.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    private function options(): array
    {
        return [
            'economicSectors' => EconomicSector::options(),
            'streetTypes' => StreetType::options(),
            'settlementTypes' => SettlementType::options(),
            'riskLevels' => RiskLevel::options(),
        ];
    }
}
