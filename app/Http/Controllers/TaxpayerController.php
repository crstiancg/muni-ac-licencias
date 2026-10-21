<?php

namespace App\Http\Controllers;

use App\Enums\DocumentType;
use App\Exceptions\DocumentLookupUnavailable;
use App\Http\Requests\StoreTaxpayerRequest;
use App\Http\Requests\UpdateTaxpayerRequest;
use App\Models\Procedure;
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
        ]);
    }

    /**
     * Up to 10 taxpayers matching ?q= (document, RUC or name), for pickers.
     */
    public function search(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q'));

        return response()->json(
            mb_strlen($term) < 2 ? [] : Taxpayer::query()
                ->search($term)
                ->orderBy('name')
                ->limit(10)
                ->get(['id', 'document_type', 'document_number', 'ruc', 'name', 'address'])
        );
    }

    /**
     * The taxpayer's establishments, for pickers (e.g. registering a procedure).
     */
    public function establishments(Taxpayer $taxpayer): JsonResponse
    {
        return response()->json(
            $taxpayer->establishments()->latest('id')->get()
        );
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

        return to_route('taxpayers.show', $taxpayer);
    }

    /**
     * Show the form to register a taxpayer.
     */
    public function create(): Response
    {
        return Inertia::render('taxpayers/create', [
            'documentTypes' => DocumentType::options(),
        ]);
    }

    /**
     * The taxpayer's file (ficha): data and establishments.
     */
    public function show(Taxpayer $taxpayer): Response
    {
        return Inertia::render('taxpayers/show', [
            'taxpayer' => $taxpayer,
            'establishments' => $taxpayer->establishments()->latest('id')->get(),
            'procedures' => $taxpayer->procedures()
                ->with(['types:id,name', 'establishment'])
                ->latest('id')
                ->limit(20)
                ->get()
                ->map(fn (Procedure $procedure) => [
                    ...$procedure->only('id', 'code', 'status', 'created_at'),
                    'status_label' => $procedure->status->label(),
                    'types' => $procedure->types->pluck('name'),
                    'establishment' => $procedure->establishment->activity.' · '.$procedure->establishment->full_address,
                ]),
            'documentTypes' => DocumentType::options(),
        ]);
    }

    /**
     * Show the form to edit the given taxpayer.
     */
    public function edit(Taxpayer $taxpayer): Response
    {
        return Inertia::render('taxpayers/edit', [
            'taxpayer' => $taxpayer,
            'documentTypes' => DocumentType::options(),
        ]);
    }

    /**
     * Update the given taxpayer.
     */
    public function update(UpdateTaxpayerRequest $request, Taxpayer $taxpayer): RedirectResponse
    {
        $taxpayer->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => "Contribuyente {$taxpayer->name} actualizado."]);

        return to_route('taxpayers.show', $taxpayer);
    }

    /**
     * Delete the given taxpayer.
     */
    public function destroy(Taxpayer $taxpayer): RedirectResponse
    {
        if ($taxpayer->establishments()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => "{$taxpayer->name} tiene establecimientos registrados; no se puede eliminar."]);

            return back();
        }

        $taxpayer->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Contribuyente {$taxpayer->name} eliminado."]);

        return to_route('taxpayers.index');
    }
}
