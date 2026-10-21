<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUitRequest;
use App\Http\Requests\UpdateUitRequest;
use App\Models\Uit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class UitController extends Controller
{
    /**
     * Display the UITs paginated on the server, most recent year first.
     *
     * Query string: ?filter[search]=&sort=year|-year|amount|-amount&page=
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $uits = QueryBuilder::for(Uit::class)
            // No delimiter: a search like "260,2024" is a single term.
            ->allowedFilters(AllowedFilter::scope('search')->delimiter(''))
            ->allowedSorts('year', 'amount')
            ->defaultSort('-year')
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        if ($uits->isEmpty() && $uits->currentPage() > 1) {
            return to_route('uits.index', [
                ...$request->query(),
                'page' => max($uits->lastPage(), 1),
            ]);
        }

        return Inertia::render('uits/index', [
            'uits' => $uits,
            'filters' => [
                'search' => $request->input('filter.search'),
                'sort' => $request->input('sort', '-year'),
            ],
            'currentYear' => now()->year,
        ]);
    }

    /**
     * Store a newly registered UIT.
     */
    public function store(StoreUitRequest $request): RedirectResponse
    {
        $uit = Uit::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "UIT {$uit->year} registrada."]);

        return back();
    }

    /**
     * Update the given UIT.
     */
    public function update(UpdateUitRequest $request, Uit $uit): RedirectResponse
    {
        $uit->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "UIT {$uit->year} actualizada."]);

        return back();
    }

    /**
     * Delete the given UIT.
     */
    public function destroy(Uit $uit): RedirectResponse
    {
        $uit->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "UIT {$uit->year} eliminada."]);

        return back();
    }
}
