import { Head, Link, router } from '@inertiajs/react';
import { Eye, MapPin, Plus, X } from 'lucide-react';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import ProcedureStatusBadge from '@/components/procedure-status-badge';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ago, toDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { create, index, show } from '@/routes/procedures';
import type { Paginated, Procedure, ProcedureStatusValue } from '@/types';

const DEFAULT_SORT = '-created_at';

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

type Filters = {
    search: string | null;
    status: string | null;
    type: string | null;
    from: string | null;
    to: string | null;
    sort: string;
};

function params({ search, status, type, from, to, sort }: Filters) {
    const filter = Object.fromEntries(
        Object.entries({ search, status, type, from, to }).filter(
            ([, value]) => value,
        ),
    );

    return {
        ...(Object.keys(filter).length ? { filter } : {}),
        ...(sort !== DEFAULT_SORT ? { sort } : {}),
    };
}

/**
 * Reloads the list with Spatie Query Builder params, back on page 1.
 */
function visit(filters: Filters) {
    router.get(index().url, params(filters), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        only: ['procedures', 'filters', 'status_counts'],
    });
}

/**
 * Procedures by step: tabs with how many wait at each one, and filters by
 * procedure type and registration date.
 */
export default function ProcedureIndex({
    procedures,
    filters,
    statuses,
    status_counts,
    types,
}: {
    procedures: Paginated<Procedure>;
    filters: Filters;
    statuses: { value: ProcedureStatusValue; label: string }[];
    status_counts: Partial<Record<ProcedureStatusValue, number>>;
    types: SelectOption[];
}) {
    const statusLabel = (value: ProcedureStatusValue) =>
        statuses.find((status) => status.value === value)?.label ?? value;

    const total = Object.values(status_counts).reduce(
        (sum, count) => sum + (count ?? 0),
        0,
    );

    const tabs = [
        { value: null, label: 'Todos', count: total },
        ...statuses.map((status) => ({
            value: status.value as string,
            label: status.label,
            count: status_counts[status.value] ?? 0,
        })),
    ];

    const filtered = Boolean(
        filters.search || filters.type || filters.from || filters.to,
    );

    return (
        <>
            <Head title="Trámites" />

            <div className="flex flex-col gap-5 p-4 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <Heading
                        title="Trámites"
                        description="Solicitudes de licencias, autorizaciones y demás procedimientos del TUPA"
                    />

                    <Button asChild data-test="create-procedure-button">
                        <Link href={create()}>
                            <Plus />
                            Nuevo trámite
                        </Link>
                    </Button>
                </div>

                <section
                    aria-label="Listado de trámites"
                    className="overflow-hidden rounded-2xl border bg-card"
                >
                    <nav
                        aria-label="Filtrar por estado"
                        className="flex gap-1 overflow-x-auto border-b px-4"
                    >
                        {tabs.map((tab) => {
                            const active =
                                (filters.status ?? null) === tab.value;

                            return (
                                <button
                                    key={tab.value ?? 'all'}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() =>
                                        visit({ ...filters, status: tab.value })
                                    }
                                    className={cn(
                                        'flex h-12 shrink-0 items-center gap-2 px-3 text-sm whitespace-nowrap transition-colors',
                                        active
                                            ? 'font-bold text-foreground shadow-[inset_0_-3px_0_var(--gold-strong)]'
                                            : 'font-medium text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {tab.label}
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                                            active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {tab.count.toLocaleString('es-PE')}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    <div className="flex flex-wrap items-end gap-3 p-4">
                        <SearchInput
                            initial={filters.search ?? ''}
                            placeholder="Código, expediente, contribuyente o DNI/RUC"
                            label="Buscar trámite"
                            onSearch={(search) =>
                                visit({ ...filters, search: search || null })
                            }
                        />
                        <div className="w-72">
                            <FormSelect
                                id="type"
                                name="type"
                                options={types}
                                defaultValue={filters.type}
                                emptyLabel="Todos los procedimientos"
                                onValueChange={(type) =>
                                    visit({ ...filters, type: type || null })
                                }
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label
                                htmlFor="from"
                                className="text-xs text-muted-foreground"
                            >
                                Desde
                            </Label>
                            <Input
                                id="from"
                                type="date"
                                className="w-40"
                                defaultValue={filters.from ?? ''}
                                max={filters.to ?? undefined}
                                onChange={(event) =>
                                    visit({
                                        ...filters,
                                        from: event.target.value || null,
                                    })
                                }
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label
                                htmlFor="to"
                                className="text-xs text-muted-foreground"
                            >
                                Hasta
                            </Label>
                            <Input
                                id="to"
                                type="date"
                                className="w-40"
                                defaultValue={filters.to ?? ''}
                                min={filters.from ?? undefined}
                                onChange={(event) =>
                                    visit({
                                        ...filters,
                                        to: event.target.value || null,
                                    })
                                }
                            />
                        </div>
                        {filtered && (
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    router.get(
                                        index().url,
                                        params({
                                            search: null,
                                            status: filters.status,
                                            type: null,
                                            from: null,
                                            to: null,
                                            sort: filters.sort,
                                        }),
                                    )
                                }
                            >
                                <X />
                                Limpiar filtros
                            </Button>
                        )}
                    </div>

                    {procedures.data.length === 0 ? (
                        <div className="border-t px-4 py-14 text-center">
                            <p className="font-semibold">
                                {filtered || filters.status
                                    ? 'No hay trámites con esos filtros'
                                    : 'Aún no hay trámites registrados'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {filtered || filters.status
                                    ? 'Prueba con otro estado o quita los filtros.'
                                    : 'Registra el primero con “Nuevo trámite”.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-sm">
                                <thead className="border-y bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <tr>
                                        <SortableHeader
                                            column="code"
                                            sort={filters.sort}
                                            onSort={(sort) =>
                                                visit({ ...filters, sort })
                                            }
                                        >
                                            Código
                                        </SortableHeader>
                                        <th className="px-4 py-3 font-semibold">
                                            Contribuyente
                                        </th>
                                        <th className="px-4 py-3 font-semibold">
                                            Establecimiento
                                        </th>
                                        <th className="px-4 py-3 font-semibold">
                                            Procedimientos
                                        </th>
                                        <th className="px-4 py-3 font-semibold">
                                            Estado
                                        </th>
                                        <SortableHeader
                                            column="created_at"
                                            sort={filters.sort}
                                            onSort={(sort) =>
                                                visit({ ...filters, sort })
                                            }
                                        >
                                            Registro
                                        </SortableHeader>
                                        <th className="px-4 py-3 text-right font-semibold">
                                            <span className="sr-only">
                                                Acciones
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {procedures.data.map((procedure) => {
                                        const [first, ...rest] =
                                            procedure.types ?? [];

                                        return (
                                            <tr
                                                key={procedure.id}
                                                className="align-middle transition-colors hover:bg-muted/40"
                                            >
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Link
                                                        href={show(
                                                            procedure.id,
                                                        )}
                                                        className="font-mono text-[15px] font-semibold tabular-nums hover:text-link hover:underline"
                                                    >
                                                        {procedure.code}
                                                    </Link>
                                                    <div className="text-xs text-muted-foreground">
                                                        {procedure.file_number
                                                            ? `Exp. ${procedure.file_number}`
                                                            : 'Sin expediente'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold">
                                                        {
                                                            procedure.taxpayer
                                                                ?.name
                                                        }
                                                    </div>
                                                    {procedure.taxpayer && (
                                                        <div className="font-mono text-xs text-muted-foreground">
                                                            {procedure.taxpayer.document_type.toUpperCase()}{' '}
                                                            {
                                                                procedure
                                                                    .taxpayer
                                                                    .document_number
                                                            }
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-medium">
                                                        {procedure.establishment
                                                            ?.trade_name ??
                                                            procedure
                                                                .establishment
                                                                ?.activity}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <MapPin className="size-3 shrink-0" />
                                                        {
                                                            procedure
                                                                .establishment
                                                                ?.full_address
                                                        }
                                                    </div>
                                                </td>
                                                <td className="max-w-80 px-4 py-4">
                                                    {first && (
                                                        <div
                                                            className="flex flex-wrap items-center gap-1.5"
                                                            title={procedure.types
                                                                ?.map(
                                                                    (type) =>
                                                                        type.name,
                                                                )
                                                                .join('\n')}
                                                        >
                                                            <span className="line-clamp-2 text-xs leading-snug">
                                                                {first.name}
                                                            </span>
                                                            {rest.length >
                                                                0 && (
                                                                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-link">
                                                                    +
                                                                    {
                                                                        rest.length
                                                                    }
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <ProcedureStatusBadge
                                                        status={
                                                            procedure.status
                                                        }
                                                        label={statusLabel(
                                                            procedure.status,
                                                        )}
                                                    />
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div>
                                                        {date.format(
                                                            toDate(
                                                                procedure.created_at,
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {ago(
                                                            procedure.created_at,
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={show(
                                                                procedure.id,
                                                            )}
                                                            aria-label={`Ver trámite ${procedure.code}`}
                                                        >
                                                            <Eye />
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {procedures.total > 0 && (
                        <Pagination
                            paginator={procedures}
                            className="border-t px-4 py-3"
                        />
                    )}
                </section>
            </div>
        </>
    );
}

ProcedureIndex.layout = {
    breadcrumbs: [{ title: 'Trámites', href: index() }],
};
