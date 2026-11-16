<?php

namespace App\Http\Controllers;

use App\Enums\InspectionCaseStatus;
use App\Models\Inspection;
use App\Models\InspectionCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * Follow-up of businesses found working without a licence: notified with
 * a deadline, revisited, and closed when they get one (automatically when
 * it is issued to their RUC/DNI) or sent to sanction.
 */
class InspectionCaseController extends Controller
{
    /**
     * Statuses to filter by: "abiertos" and "vencido" are views, not statuses.
     */
    private const array FILTERS = ['abiertos', 'pendiente', 'notificado', 'vencido', 'regularizado', 'derivado'];

    /**
     * Query string: ?filter[status]=abiertos|…&filter[search]=&page=
     */
    public function index(Request $request): Response
    {
        $status = $request->input('filter.status', 'abiertos');

        $cases = QueryBuilder::for(InspectionCase::class)
            ->withCount('inspections')
            ->allowedFilters(
                AllowedFilter::scope('search')->delimiter(''),
                AllowedFilter::callback('status', fn ($query, $value) => match ($value) {
                    'abiertos' => $query->open(),
                    'vencido' => $query->overdue(),
                    'notificado' => $query->where('status', InspectionCaseStatus::Notified)
                        ->where(fn ($query) => $query->whereNull('deadline')->orWhereDate('deadline', '>=', today())),
                    default => $query->where('status', $value),
                })->default('abiertos'),
            )
            // The most urgent first: the deadline closest to expiring (or expired).
            ->orderByRaw('case when deadline is null then 1 else 0 end')
            ->orderBy('deadline')
            ->latest('id')
            ->paginate(15)
            ->onEachSide(1)
            ->withQueryString()
            ->through(fn (InspectionCase $case) => $this->row($case));

        return Inertia::render('inspections/cases/index', [
            'cases' => $cases,
            'filters' => [
                'status' => in_array($status, self::FILTERS, true) ? $status : 'abiertos',
                'search' => $request->input('filter.search'),
            ],
            'statusOptions' => [
                ['value' => 'abiertos', 'label' => 'Abiertos'],
                ['value' => 'vencido', 'label' => 'Plazo vencido'],
                ...array_map(fn (InspectionCaseStatus $status) => ['value' => $status->value, 'label' => $status->label()], InspectionCaseStatus::cases()),
            ],
            'counts' => [
                'overdue' => InspectionCase::query()->overdue()->count(),
            ],
        ]);
    }

    public function show(InspectionCase $case): Response
    {
        $case->load('license:id,number,type', 'opener:id,name', 'resolver:id,name', 'inspections.inspector:id,name');

        return Inertia::render('inspections/cases/show', [
            'case' => [
                ...$this->row($case),
                ...$case->only('holder_name', 'notice_number', 'resolution_note'),
                'notified_at' => $case->notified_at?->toDateString(),
                'resolved_at' => $case->resolved_at?->toIso8601String(),
                'created_at' => $case->created_at?->toIso8601String(),
                'opened_by' => $case->opener->name,
                'resolved_by' => $case->resolver?->name,
                'license' => $case->license ? ['id' => $case->license->id, 'number' => $case->license->number] : null,
                'inspections' => $case->inspections->map(fn (Inspection $inspection) => [
                    ...$inspection->only('id', 'code', 'visited_at', 'notes'),
                    'result' => $inspection->result->value,
                    'result_label' => $inspection->result->label(),
                    'inspector' => $inspection->inspector->name,
                ]),
            ],
            'noticeDays' => config('licencias.inspection_notice_days'),
            'closingOptions' => array_map(fn (InspectionCaseStatus $status) => ['value' => $status->value, 'label' => $status->label()], InspectionCaseStatus::closing()),
        ]);
    }

    /**
     * The business was handed the notice: it has these days to get a
     * licence. Notifying again (a new notice) resets the deadline.
     */
    public function notify(Request $request, InspectionCase $case): RedirectResponse
    {
        $this->ensureOpen($case);

        $data = $request->validate([
            'notice_number' => ['nullable', 'string', 'max:30'],
            'notified_at' => ['required', 'date', 'before_or_equal:today'],
            'days' => ['required', 'integer', 'min:1', 'max:180'],
        ], attributes: ['notice_number' => 'N° de notificación', 'notified_at' => 'fecha de notificación', 'days' => 'plazo']);

        $notifiedAt = Carbon::parse($data['notified_at'])->startOfDay();

        $case->update([
            'status' => InspectionCaseStatus::Notified,
            'notice_number' => isset($data['notice_number']) ? mb_strtoupper(trim($data['notice_number'])) : null,
            'notified_at' => $notifiedAt,
            'deadline' => $notifiedAt->copy()->addDays($data['days']),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Caso {$case->code} notificado: plazo hasta el {$case->deadline->format('d/m/Y')}."]);

        return back();
    }

    /**
     * Closed by hand: regularized (seen on a revisit, licence from
     * elsewhere) or sent to sanction. The note says why.
     */
    public function close(Request $request, InspectionCase $case): RedirectResponse
    {
        $this->ensureOpen($case);

        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn (InspectionCaseStatus $status) => $status->value, InspectionCaseStatus::closing()))],
            'resolution_note' => ['required', 'string', 'max:500'],
        ], attributes: ['status' => 'cierre', 'resolution_note' => 'sustento']);

        $case->update([
            'status' => $data['status'],
            'resolution_note' => trim($data['resolution_note']),
            'resolved_at' => now(),
            'resolved_by' => Auth::id(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Caso {$case->code}: {$case->status->label()}."]);

        return back();
    }

    private function ensureOpen(InspectionCase $case): void
    {
        if (! $case->status->isOpen()) {
            throw ValidationException::withMessages(['status' => 'Este caso ya está cerrado.']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function row(InspectionCase $case): array
    {
        return [
            ...$case->only('id', 'code', 'business_name', 'holder_document', 'address', 'activity'),
            'status' => $case->status->value,
            'status_label' => $case->statusLabel(),
            'is_open' => $case->status->isOpen(),
            'is_overdue' => $case->isOverdue(),
            'deadline' => $case->deadline?->toDateString(),
            'inspections_count' => $case->inspections_count ?? $case->inspections->count(),
        ];
    }
}
