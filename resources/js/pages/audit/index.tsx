import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronRight,
    FilePlus2,
    Pencil,
    Trash2,
    X,
} from 'lucide-react';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ago } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { index } from '@/routes/audit';
import type { Paginated } from '@/types';

const dateTime = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

type Change = { field: string; label: string; old: unknown; new: unknown };

type ActivityRow = {
    id: number;
    created_at: string;
    /** created, updated or deleted */
    event: string;
    event_label: string;
    module: string;
    subject: string;
    subject_url: string | null;
    user: string | null;
    changes: Change[];
};

type Filters = {
    module?: string | null;
    field?: string | null;
    event?: string;
    user?: string;
    from?: string;
    to?: string;
};

type Props = {
    activities: Paginated<ActivityRow>;
    filters: Filters;
    modules: SelectOption[];
    fields: SelectOption[];
    events: SelectOption[];
    users: SelectOption[];
    nested: Record<string, string>;
};

const EVENT_STYLES: Record<string, { icon: typeof Pencil; className: string }> =
    {
        created: {
            icon: FilePlus2,
            className:
                'bg-[#e3f3ec] text-[#0b6b4f] dark:bg-emerald-400/15 dark:text-emerald-300',
        },
        updated: {
            icon: Pencil,
            className:
                'bg-[#fff2d6] text-[#85520a] dark:bg-amber-400/15 dark:text-amber-300',
        },
        deleted: {
            icon: Trash2,
            className:
                'bg-[#fce9e7] text-[#a3261c] dark:bg-red-400/15 dark:text-red-300',
        },
    };

const isEmpty = (value: unknown) =>
    value === null || value === undefined || value === '';

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A logged value as people read it: dates in local time, yes/no, and the
 * inspection checks one by one.
 */
function Value({
    value,
    nested,
}: {
    value: unknown;
    nested: Record<string, string>;
}) {
    if (isEmpty(value)) {
        return <span className="text-muted-foreground">—</span>;
    }

    if (typeof value === 'boolean') {
        return <>{value ? 'Sí' : 'No'}</>;
    }

    if (typeof value === 'string' && ISO_DATE_TIME.test(value)) {
        return <>{dateTime.format(new Date(value))}</>;
    }

    if (typeof value === 'string' && ISO_DATE.test(value)) {
        return <>{new Date(`${value}T00:00:00`).toLocaleDateString('es-PE')}</>;
    }

    if (Array.isArray(value)) {
        return <>{value.join(', ')}</>;
    }

    if (typeof value === 'object') {
        return (
            <ul className="space-y-0.5">
                {Object.entries(value as Record<string, unknown>).map(
                    ([key, item]) => (
                        <li key={key}>
                            <span className="text-muted-foreground">
                                {nested[key] ?? key}:
                            </span>{' '}
                            <Value value={item} nested={nested} />
                        </li>
                    ),
                )}
            </ul>
        );
    }

    return <>{String(value as string | number)}</>;
}

function visit(filters: Filters) {
    router.get(
        index().url,
        Object.fromEntries(
            Object.entries(filters).filter(([, value]) => value),
        ),
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

/**
 * Who created, changed or deleted master data and documents: one line per
 * change, opened to see each field before and after.
 */
export default function AuditIndex({
    activities,
    filters,
    modules,
    fields,
    events,
    users,
    nested,
}: Props) {
    const filtered = Object.values(filters).some(Boolean);

    return (
        <>
            <Head title="Auditoría" />

            <div className="flex flex-col gap-5 p-4 md:p-8">
                <Heading
                    title="Auditoría"
                    description="Quién cambió qué y cuándo. Abre un registro para ver cada campo antes y después."
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-48">
                        <FormSelect
                            id="module"
                            name="module"
                            options={modules}
                            defaultValue={filters.module ?? undefined}
                            emptyLabel="Todos los módulos"
                            onValueChange={(module) =>
                                // Fields belong to a module: changing it clears the field.
                                visit({ ...filters, module, field: null })
                            }
                        />
                    </div>
                    <div className="w-56">
                        <FormSelect
                            // Remount on module change so the select shows the new list.
                            key={filters.module ?? 'none'}
                            id="field"
                            name="field"
                            options={fields}
                            defaultValue={filters.field ?? undefined}
                            emptyLabel={
                                filters.module
                                    ? 'Cualquier campo'
                                    : 'Elige un módulo para el campo'
                            }
                            disabled={!filters.module}
                            onValueChange={(field) =>
                                visit({ ...filters, field })
                            }
                        />
                    </div>
                    <div className="w-40">
                        <FormSelect
                            id="event"
                            name="event"
                            options={events}
                            defaultValue={filters.event}
                            emptyLabel="Toda acción"
                            onValueChange={(event) =>
                                visit({ ...filters, event })
                            }
                        />
                    </div>
                    <div className="w-48">
                        <FormSelect
                            id="user"
                            name="user"
                            options={users}
                            defaultValue={filters.user}
                            emptyLabel="Todos los usuarios"
                            onValueChange={(user) =>
                                visit({ ...filters, user })
                            }
                        />
                    </div>
                    <Input
                        type="date"
                        className="w-40"
                        aria-label="Desde"
                        defaultValue={filters.from}
                        onChange={(event) =>
                            visit({ ...filters, from: event.target.value })
                        }
                    />
                    <Input
                        type="date"
                        className="w-40"
                        aria-label="Hasta"
                        defaultValue={filters.to}
                        onChange={(event) =>
                            visit({ ...filters, to: event.target.value })
                        }
                    />
                    {filtered && (
                        <Button variant="ghost" asChild>
                            <Link href={index()} preserveScroll>
                                <X />
                                Limpiar
                            </Link>
                        </Button>
                    )}
                </div>

                {activities.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                        No hay cambios registrados con esos filtros.
                    </div>
                ) : (
                    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                        {activities.data.map((activity) => (
                            <li key={activity.id}>
                                <ActivityItem
                                    activity={activity}
                                    highlight={filters.field ?? null}
                                    nested={nested}
                                />
                            </li>
                        ))}
                    </ul>
                )}

                <Pagination paginator={activities} />
            </div>
        </>
    );
}

function ActivityItem({
    activity,
    highlight,
    nested,
}: {
    activity: ActivityRow;
    highlight: string | null;
    nested: Record<string, string>;
}) {
    const style = EVENT_STYLES[activity.event] ?? EVENT_STYLES.updated;
    const Icon = style.icon;
    const created = activity.event === 'created';
    // A creation logs every column: only the ones that got a value matter.
    const changes = created
        ? activity.changes.filter((change) => !isEmpty(change.new))
        : activity.changes;
    const shown = changes.slice(0, 4);

    return (
        <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
                <span
                    className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        style.className,
                    )}
                    title={activity.event_label}
                >
                    <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                        <span className="font-semibold">
                            {activity.user ?? 'Sistema'}
                        </span>{' '}
                        <span className="text-muted-foreground">
                            {activity.event_label.toLowerCase()}
                        </span>{' '}
                        {activity.module.toLowerCase()}{' '}
                        <span className="font-mono font-medium">
                            {activity.subject}
                        </span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                        {created ? (
                            <span className="text-xs text-muted-foreground">
                                {changes.length} campos registrados
                            </span>
                        ) : (
                            <>
                                {shown.map((change) => (
                                    <span
                                        key={change.field}
                                        className={cn(
                                            'rounded-md px-1.5 py-0.5 text-xs',
                                            change.field === highlight
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {change.label}
                                    </span>
                                ))}
                                {changes.length > shown.length && (
                                    <span className="text-xs text-muted-foreground">
                                        +{changes.length - shown.length} más
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <time
                    dateTime={activity.created_at}
                    title={dateTime.format(new Date(activity.created_at))}
                    className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block"
                >
                    {ago(activity.created_at)}
                    <br />
                    {dateTime.format(new Date(activity.created_at))}
                </time>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>

            <div className="border-t bg-muted/30 px-4 py-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="sm:hidden">
                        {dateTime.format(new Date(activity.created_at))}
                    </span>
                    {activity.subject_url && (
                        <Link
                            href={activity.subject_url}
                            className="font-medium text-link hover:underline"
                        >
                            Abrir {activity.module.toLowerCase()}{' '}
                            {activity.subject}
                        </Link>
                    )}
                </div>

                {changes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Sin campos registrados.
                    </p>
                ) : (
                    <dl className="divide-y rounded-xl border bg-card text-sm">
                        {changes.map((change) => (
                            <div
                                key={change.field}
                                className={cn(
                                    'grid gap-1 px-3 py-2 sm:grid-cols-[14rem_1fr]',
                                    change.field === highlight &&
                                        'bg-accent/50',
                                )}
                            >
                                <dt className="font-medium">{change.label}</dt>
                                <dd className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1 break-words">
                                    {!created && (
                                        <>
                                            <span className="text-[#a3261c] line-through decoration-1 dark:text-red-300">
                                                <Value
                                                    value={change.old}
                                                    nested={nested}
                                                />
                                            </span>
                                            <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                        </>
                                    )}
                                    <span className="font-medium text-[#0b6b4f] dark:text-emerald-300">
                                        <Value
                                            value={change.new}
                                            nested={nested}
                                        />
                                    </span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
        </details>
    );
}

AuditIndex.layout = {
    breadcrumbs: [{ title: 'Auditoría', href: index() }],
};
