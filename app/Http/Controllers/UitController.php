<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUitRequest;
use App\Http\Requests\UpdateUitRequest;
use App\Models\Uit;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UitController extends Controller
{
    /**
     * Display the UITs, most recent year first.
     */
    public function index(): Response
    {
        return Inertia::render('uits/index', [
            'uits' => Uit::query()->orderByDesc('year')->get(),
            'currentYear' => now()->year,
        ]);
    }

    /**
     * Show the form for registering a new UIT.
     */
    public function create(): Response
    {
        return Inertia::render('uits/create');
    }

    /**
     * Store a newly registered UIT.
     */
    public function store(StoreUitRequest $request): RedirectResponse
    {
        $uit = Uit::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "UIT {$uit->year} registrada."]);

        return to_route('uits.index');
    }

    /**
     * Show the form for editing the given UIT.
     */
    public function edit(Uit $uit): Response
    {
        return Inertia::render('uits/edit', [
            'uit' => $uit,
        ]);
    }

    /**
     * Update the given UIT.
     */
    public function update(UpdateUitRequest $request, Uit $uit): RedirectResponse
    {
        $uit->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "UIT {$uit->year} actualizada."]);

        return to_route('uits.index');
    }

    /**
     * Delete the given UIT.
     */
    public function destroy(Uit $uit): RedirectResponse
    {
        $uit->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "UIT {$uit->year} eliminada."]);

        return to_route('uits.index');
    }
}
