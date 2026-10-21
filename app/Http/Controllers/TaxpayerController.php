<?php

namespace App\Http\Controllers;

use App\Enums\DocumentType;
use App\Exceptions\DocumentLookupUnavailable;
use App\Http\Requests\StoreTaxpayerRequest;
use App\Http\Requests\UpdateTaxpayerRequest;
use App\Models\Taxpayer;
use App\Rules\Ruc;
use App\Services\DocumentLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class TaxpayerController extends Controller
{
    /**
     * Display the taxpayers paginated on the server.
     *
     * Query string: ?filter[search]=&sort=name|document_number (prefix - for desc)&page=
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $taxpayers = QueryBuilder::for(Taxpayer::class)
            ->allowedFilters(AllowedFilter::scope('search')->delimiter(''))
            ->allowedSorts('name', 'document_number')
            ->defaultSort('name')
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        if ($taxpayers->isEmpty() && $taxpayers->currentPage() > 1) {
            return to_route('taxpayers.index', [
                ...$request->query(),
                'page' => max($taxpayers->lastPage(), 1),
            ]);
        }

        return Inertia::render('taxpayers/index', [
            'taxpayers' => $taxpayers,
            'filters' => [
                'search' => $request->input('filter.search'),
                'sort' => $request->input('sort', 'name'),
            ],
            'documentTypes' => DocumentType::options(),
        ]);
    }

    /**
     * Find a document: first among registered taxpayers, then in RENIEC/SUNAT.
     *
     * 200 {source: local, taxpayer} | {source: reniec|sunat, data}
     * 404 not found · 422 invalid number · 503 lookup unavailable
     */
    public function lookup(Request $request, DocumentLookup $lookup): JsonResponse
    {
        $type = DocumentType::tryFrom((string) $request->query('document_type'));

        $request->validate([
            'document_type' => ['required', Rule::enum(DocumentType::class)],
            'number' => array_values(array_filter([
                'required',
                'string',
                $type ? 'regex:'.$type->pattern() : null,
                $type === DocumentType::Ruc ? new Ruc : null,
            ])),
        ], attributes: ['number' => 'número de documento']);

        $number = (string) $request->query('number');

        if ($taxpayer = Taxpayer::query()->document($type, $number)->first()) {
            return response()->json(['source' => 'local', 'taxpayer' => $taxpayer]);
        }

        $source = $type === DocumentType::Ruc ? 'SUNAT' : 'RENIEC';

        try {
            $data = $lookup->find($type, $number);
        } catch (DocumentLookupUnavailable) {
            return response()->json(['message' => "La consulta a {$source} no está disponible. Ingresa los datos manualmente."], 503);
        }

        if ($data === null) {
            return response()->json([
                'message' => $type === DocumentType::Ce
                    ? 'El carnet de extranjería no se puede consultar en línea. Ingresa los datos manualmente.'
                    : "No se encontró el documento en {$source}.",
            ], 404);
        }

        return response()->json(['source' => strtolower($source), 'data' => $data]);
    }

    /**
     * Store a newly registered taxpayer.
     */
    public function store(StoreTaxpayerRequest $request): RedirectResponse
    {
        $taxpayer = Taxpayer::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Contribuyente {$taxpayer->name} registrado."]);

        return back();
    }

    /**
     * Update the given taxpayer.
     */
    public function update(UpdateTaxpayerRequest $request, Taxpayer $taxpayer): RedirectResponse
    {
        $taxpayer->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Contribuyente {$taxpayer->name} actualizado."]);

        return back();
    }

    /**
     * Delete the given taxpayer.
     */
    public function destroy(Taxpayer $taxpayer): RedirectResponse
    {
        $taxpayer->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Contribuyente {$taxpayer->name} eliminado."]);

        return back();
    }
}
