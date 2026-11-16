<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuditCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class AuditController extends Controller
{
    private const array EVENTS = [
        'created' => 'Creó',
        'updated' => 'Modificó',
        'deleted' => 'Eliminó',
    ];

    /**
     * Who changed what and when, one line per change with its detail on
     * demand. With a module, it can be narrowed to one changed field.
     *
     * Query string: ?module=&field=&event=&user=&from=&to=&page=
     */
    public function index(Request $request): Response
    {
        $filters = $request->only('module', 'field', 'event', 'user', 'from', 'to');
        $module = isset(AuditCatalog::MODULES[$filters['module'] ?? '']) ? $filters['module'] : null;
        $fields = $module ? AuditCatalog::fields($module) : [];

        // Only a column of the chosen module: it goes into a JSON path.
        $filters['field'] = collect($fields)->contains('value', $filters['field'] ?? null) ? $filters['field'] : null;

        $activities = Activity::query()
            ->with('causer:id,name', 'subject')
            ->when($module, fn ($query, $module) => $query->where('log_name', $module))
            // A creation logs every column, empty ones included: it counts
            // only if the field got a value. A change counts even if it was
            // emptied.
            ->when($filters['field'], fn ($query, $field) => $query->where(fn ($query) => $query
                ->where(fn ($query) => $query->where('event', '!=', 'created')->whereJsonContainsKey("attribute_changes->attributes->{$field}"))
                ->orWhere(fn ($query) => $query->where('event', 'created')->whereNotNull("attribute_changes->attributes->{$field}"))
            ))
            ->when($filters['event'] ?? null, fn ($query, $event) => $query->where('event', $event))
            ->when($filters['user'] ?? null, fn ($query, $user) => $query->where('causer_id', $user))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->whereDate('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->whereDate('created_at', '<=', $to))
            ->latest('id')
            ->paginate(25)
            ->onEachSide(1)
            ->withQueryString();

        return Inertia::render('audit/index', [
            'activities' => $activities->through(fn (Activity $activity) => $this->row($activity, $filters['field'])),
            'filters' => [...$filters, 'module' => $module],
            'modules' => collect(AuditCatalog::MODULES)->map(fn (array $item, string $value) => ['value' => $value, 'label' => $item['label']])->values(),
            'fields' => $fields,
            'events' => collect(self::EVENTS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'users' => User::query()->orderBy('name')->get(['id', 'name'])->map(fn ($user) => ['value' => (string) $user->id, 'label' => $user->name]),
            'nested' => AuditCatalog::NESTED,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function row(Activity $activity, ?string $highlight): array
    {
        $old = $activity->attribute_changes?->get('old') ?? [];
        $route = AuditCatalog::MODULES[$activity->log_name]['route'] ?? null;

        $changes = collect($activity->attribute_changes?->get('attributes', []))
            ->map(fn ($new, string $field) => [
                'field' => $field,
                'label' => AuditCatalog::field($field, $activity->log_name),
                'old' => $old[$field] ?? null,
                'new' => $new,
            ])
            // The filtered field first, so it reads at a glance.
            ->sortBy(fn (array $change) => $change['field'] === $highlight ? 0 : 1)
            ->values();

        return [
            'id' => $activity->id,
            'created_at' => $activity->created_at,
            'event' => $activity->event,
            'event_label' => self::EVENTS[$activity->event] ?? $activity->event,
            'module' => AuditCatalog::module($activity->log_name),
            'subject' => AuditCatalog::subjectLabel($activity->subject, $activity->subject_id),
            'subject_url' => $activity->subject && $route && Route::has($route) ? route($route, $activity->subject) : null,
            'user' => $activity->causer?->name,
            'changes' => $changes,
        ];
    }
}
