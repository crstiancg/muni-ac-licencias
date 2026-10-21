<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class AuditController extends Controller
{
    /**
     * Log name (table) => module label shown to users.
     */
    private const array MODULES = [
        'taxpayers' => 'Contribuyentes',
        'establishments' => 'Establecimientos',
        'licenses' => 'Licencias',
        'itse_certificates' => 'ITSE',
        'payment_orders' => 'Órdenes de pago',
        'procedure_types' => 'Tipos de trámite',
        'uits' => 'UIT',
    ];

    private const array EVENTS = [
        'created' => 'Creó',
        'updated' => 'Modificó',
        'deleted' => 'Eliminó',
    ];

    /**
     * Who changed what and when, with the old and new values.
     *
     * Query string: ?module=&event=&user=&from=&to=&page=
     */
    public function index(Request $request): Response
    {
        $filters = $request->only('module', 'event', 'user', 'from', 'to');

        $activities = Activity::query()
            ->with('causer:id,name')
            ->when($filters['module'] ?? null, fn ($query, $module) => $query->where('log_name', $module))
            ->when($filters['event'] ?? null, fn ($query, $event) => $query->where('event', $event))
            ->when($filters['user'] ?? null, fn ($query, $user) => $query->where('causer_id', $user))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->whereDate('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->whereDate('created_at', '<=', $to))
            ->latest('id')
            ->paginate(20)
            ->onEachSide(1)
            ->withQueryString();

        return Inertia::render('audit/index', [
            'activities' => $activities->through(fn (Activity $activity) => [
                'id' => $activity->id,
                'created_at' => $activity->created_at,
                'module' => self::MODULES[$activity->log_name] ?? $activity->log_name,
                'event' => self::EVENTS[$activity->event] ?? $activity->event,
                'subject_id' => $activity->subject_id,
                'user' => $activity->causer?->name,
                'changes' => collect($activity->attribute_changes?->get('attributes', []))
                    ->map(fn ($new, $field) => [
                        'field' => $field,
                        'old' => $activity->attribute_changes?->get('old')[$field] ?? null,
                        'new' => $new,
                    ])
                    ->values(),
            ]),
            'filters' => $filters,
            'modules' => collect(self::MODULES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'events' => collect(self::EVENTS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'users' => User::query()->orderBy('name')->get(['id', 'name'])->map(fn ($user) => ['value' => (string) $user->id, 'label' => $user->name]),
        ]);
    }
}
