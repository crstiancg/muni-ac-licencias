import { Head, router } from '@inertiajs/react';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import { Input } from '@/components/ui/input';
import { index } from '@/routes/audit';
import type { Paginated } from '@/types';

const dateTime = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
});

type Change = { field: string; old: unknown; new: unknown };

type ActivityRow = {
    id: number;
    created_at: string;
    module: string;
    event: string;
    subject_id: number | null;
    user: string | null;
    changes: Change[];
};

type Filters = {
    module?: string;
    event?: string;
    user?: string;
    from?: string;
    to?: string;
};

const show = (value: unknown) =>
    value === null || value === undefined || value === ''
        ? '—'
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

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
 * Who created, changed or deleted master data and documents, with the old
 * and new value of every changed field.
 */
export default function AuditIndex({
    activities,
    filters,
    modules,
    events,
    users,
}: {
    activities: Paginated<ActivityRow>;
    filters: Filters;
    modules: SelectOption[];
    events: SelectOption[];
    users: SelectOption[];
}) {
    return (
        <>
            <Head title="Auditoría" />

            <div className="flex flex-col gap-6 p-4">
                <Heading
                    title="Auditoría"
                    description="Quién cambió qué y cuándo en contribuyentes, establecimientos, licencias, ITSE, órdenes de pago y catálogos"
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-52">
                        <FormSelect
                            id="module"
                            name="module"
                            options={modules}
                            defaultValue={filters.module}
                            emptyLabel="Todos los módulos"
                            onValueChange={(module) =>
                                visit({ ...filters, module })
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
                    <div className="w-52">
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
                </div>

                {activities.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        No hay cambios registrados con esos filtros.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {activities.data.map((activity) => (
                            <li
                                key={activity.id}
                                className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span>
                                        <span className="font-medium">
                                            {activity.user ?? 'Sistema'}
                                        </span>{' '}
                                        {activity.event.toLowerCase()}{' '}
                                        {activity.module.toLowerCase()} #
                                        {activity.subject_id}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {dateTime.format(
                                            new Date(activity.created_at),
                                        )}
                                    </span>
                                </div>
                                {activity.changes.length > 0 && (
                                    <table className="mt-3 w-full text-xs">
                                        <thead className="text-left text-muted-foreground">
                                            <tr>
                                                <th className="py-1 pr-3 font-medium">
                                                    Campo
                                                </th>
                                                <th className="py-1 pr-3 font-medium">
                                                    Antes
                                                </th>
                                                <th className="py-1 font-medium">
                                                    Después
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {activity.changes.map((change) => (
                                                <tr key={change.field}>
                                                    <td className="py-1 pr-3 font-mono">
                                                        {change.field}
                                                    </td>
                                                    <td className="py-1 pr-3 text-red-700 dark:text-red-300">
                                                        {show(change.old)}
                                                    </td>
                                                    <td className="py-1 text-emerald-700 dark:text-emerald-300">
                                                        {show(change.new)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                <Pagination paginator={activities} />
            </div>
        </>
    );
}

AuditIndex.layout = {
    breadcrumbs: [{ title: 'Auditoría', href: index() }],
};
