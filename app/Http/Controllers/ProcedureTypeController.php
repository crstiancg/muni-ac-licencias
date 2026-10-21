<?php

namespace App\Http\Controllers;

use App\Enums\IssuedDocumentType;
use App\Enums\LicenseEffect;
use App\Enums\RiskLevel;
use App\Http\Requests\StoreProcedureTypeRequest;
use App\Http\Requests\UpdateProcedureTypeRequest;
use App\Models\ProcedureType;
use App\Models\Uit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProcedureTypeController extends Controller
{
    /**
     * Display the procedure types paginated on the server, with the fee for
     * the UIT of the current year.
     *
     * Query string: ?filter[search]=&filter[status]=active|inactive|all
     *               &sort=position|name|uit_percentage (prefix - for desc)&page=
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $currentUit = Uit::query()->firstWhere('year', now()->year);

        $procedureTypes = QueryBuilder::for(ProcedureType::class)
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::scope('status')->default('active'),
            )
            ->allowedSorts('position', 'name', 'uit_percentage')
            ->defaultSort('position')
            ->orderBy('id')
            ->paginate(10)
            ->onEachSide(1)
            ->withQueryString();

        if ($procedureTypes->isEmpty() && $procedureTypes->currentPage() > 1) {
            return to_route('procedure-types.index', [
                ...$request->query(),
                'page' => max($procedureTypes->lastPage(), 1),
            ]);
        }

        return Inertia::render('procedure-types/index', [
            'procedureTypes' => $procedureTypes->through(fn (ProcedureType $type) => [
                ...$type->toArray(),
                'fee' => $currentUit ? $type->feeFor($currentUit) : null,
            ]),
            'filters' => [
                'search' => $request->input('filter.search'),
                'status' => $request->input('filter.status', 'active'),
                'sort' => $request->input('sort', 'position'),
            ],
            'currentUit' => $currentUit?->only('year', 'amount'),
            'riskLevels' => RiskLevel::options(),
            'documentTypes' => IssuedDocumentType::options(),
            'licenseEffects' => LicenseEffect::options(),
        ]);
    }

    /**
     * Store a newly registered procedure type, last in order unless given.
     */
    public function store(StoreProcedureTypeRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['position'] ??= (int) ProcedureType::query()->max('position') + 1;

        $type = ProcedureType::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Tipo de trámite «{$type->name}» registrado."]);

        return back();
    }

    /**
     * Update the given procedure type.
     */
    public function update(UpdateProcedureTypeRequest $request, ProcedureType $procedureType): RedirectResponse
    {
        $data = $request->validated();
        $data['position'] ??= $procedureType->position;

        $procedureType->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Tipo de trámite «{$procedureType->name}» actualizado."]);

        return back();
    }

    /**
     * Delete the given procedure type.
     */
    public function destroy(ProcedureType $procedureType): RedirectResponse
    {
        $procedureType->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Tipo de trámite «{$procedureType->name}» eliminado."]);

        return back();
    }
}
