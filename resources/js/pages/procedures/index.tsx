import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import FormSelect from '@/components/form-select';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import ProcedureStatusBadge from '@/components/procedure-status-badge';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Button } from '@/components/ui/button';
import { create, index, show } from '@/routes/procedures';
import type { Paginated, Procedure, ProcedureStatusValue } from '@/types';

const DEFAULT_SORT = '-created_at';

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

type Filters = { search: string | null; status: string | null; sort: string };

/**
 * Reloads the list with Spatie Query Builder params
 * (?filter[search]=&filter[status]=&sort=), back on page 1.
 */
function visit({ search, status, sort }: Filters) {
    const filter = {
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
    };

    router.get(
        index().url,
        {
            ...(Object.keys(filter).length ? { filter } : {}),
            ...(sort !== DEFAULT_SORT ? { sort } : {}),
        },
        {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['procedures', 'filters'],
        },
    );
}

export default function ProcedureIndex({
    procedures,
    filters,
    statuses,
}: {
    procedures: Paginated<Procedure>;
    filters: Filters;
    statuses: { value: ProcedureStatusValue; label: string }[];
}) {
    const statusLabel = (value: ProcedureStatusValue) =>
        statuses.find((status) => status.value === value)?.label ?? value;

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

                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput
                        initial={filters.search ?? ''}
                        placeholder="Buscar por código, expediente o contribuyente"
                        label="Buscar trámite"
                        onSearch={(search) =>
                            visit({ ...filters, search: search || null })
                        }
                    />
                    <div className="w-52">
                        <FormSelect
                            id="status"
                            name="status"
                            options={statuses}
                            defaultValue={filters.status}
                            emptyLabel="Todos los estados"
                            onValueChange={(status) =>
                                visit({ ...filters, status: status || null })
                            }
                        />
                    </div>
                </div>

                {procedures.data.length === 0 ? (
                    <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
                        {filters.search || filters.status
                            ? 'No hay trámites con esos filtros.'
                            : 'Aún no hay trámites registrados.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border bg-card">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">
                                        Código
                                    </th>
                                    <th className="px-4 py-3 font-semibold">
                                        Contribuyente / establecimiento
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
                                        Fecha
                                    </SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {procedures.data.map((procedure) => (
                                    <tr
                                        key={procedure.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link
                                                href={show(procedure.id)}
                                                className="font-mono font-semibold tabular-nums hover:text-link hover:underline"
                                            >
                                                {procedure.code}
                                            </Link>
                                            {procedure.file_number && (
                                                <div className="text-xs text-muted-foreground">
                                                    Exp. {procedure.file_number}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {procedure.taxpayer?.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {
                                                    procedure.establishment
                                                        ?.activity
                                                }{' '}
                                                ·{' '}
                                                {
                                                    procedure.establishment
                                                        ?.full_address
                                                }
                                            </div>
                                        </td>
                                        <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                                            {procedure.types
                                                ?.map((type) => type.name)
                                                .join(' · ')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ProcedureStatusBadge
                                                status={procedure.status}
                                                label={statusLabel(
                                                    procedure.status,
                                                )}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {date.format(
                                                new Date(procedure.created_at),
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={procedures} />
            </div>
        </>
    );
}

ProcedureIndex.layout = {
    breadcrumbs: [{ title: 'Trámites', href: index() }],
};
