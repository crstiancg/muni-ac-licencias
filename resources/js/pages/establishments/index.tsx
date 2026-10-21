import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Button } from '@/components/ui/button';
import { create, edit, index } from '@/routes/establishments';
import { show } from '@/routes/taxpayers';
import type { Establishment, Paginated } from '@/types';

const DEFAULT_SORT = '-id';

type Filters = { search: string | null; sort: string };

/**
 * Reloads the list with Spatie Query Builder params
 * (?filter[search]=&sort=), back on page 1. Defaults are left out of the URL.
 */
function visit({ search, sort }: Filters) {
    router.get(
        index().url,
        {
            ...(search ? { filter: { search } } : {}),
            ...(sort !== DEFAULT_SORT ? { sort } : {}),
        },
        {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['establishments', 'filters'],
        },
    );
}

export default function EstablishmentIndex({
    establishments,
    filters,
}: {
    establishments: Paginated<Establishment>;
    filters: Filters;
}) {
    const sortBy = (sort: string) => visit({ ...filters, sort });

    return (
        <>
            <Head title="Establecimientos" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Establecimientos"
                        description="Locales donde los contribuyentes desarrollan su actividad"
                    />

                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Registrar establecimiento
                        </Link>
                    </Button>
                </div>

                <SearchInput
                    initial={filters.search ?? ''}
                    placeholder="Buscar por giro, nombre, calle o contribuyente"
                    label="Buscar establecimiento"
                    onSearch={(search) =>
                        visit({ ...filters, search: search || null })
                    }
                />

                {establishments.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        {filters.search
                            ? `No hay establecimientos que coincidan con “${filters.search}”.`
                            : 'Aún no hay establecimientos registrados.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-muted-foreground">
                                <tr>
                                    <SortableHeader
                                        column="activity"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Giro
                                    </SortableHeader>
                                    <SortableHeader
                                        column="street"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Dirección
                                    </SortableHeader>
                                    <th className="px-4 py-3 font-medium">
                                        Contribuyente
                                    </th>
                                    <SortableHeader
                                        column="area"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                        align="right"
                                    >
                                        Área
                                    </SortableHeader>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">
                                            Acciones
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {establishments.data.map((establishment) => (
                                    <tr
                                        key={establishment.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {establishment.activity}
                                            </div>
                                            {establishment.trade_name && (
                                                <div className="text-xs text-muted-foreground">
                                                    {establishment.trade_name}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {establishment.full_address}
                                        </td>
                                        <td className="px-4 py-3">
                                            {establishment.taxpayer && (
                                                <Link
                                                    href={show(
                                                        establishment.taxpayer
                                                            .id,
                                                    )}
                                                    className="hover:underline"
                                                >
                                                    {
                                                        establishment.taxpayer
                                                            .name
                                                    }
                                                </Link>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                            {establishment.area
                                                ? `${Number(establishment.area).toLocaleString('es-PE')} m²`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                >
                                                    <Link
                                                        href={edit(
                                                            establishment.id,
                                                        )}
                                                        aria-label="Editar establecimiento"
                                                    >
                                                        <Pencil />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={establishments} />
            </div>
        </>
    );
}

EstablishmentIndex.layout = {
    breadcrumbs: [{ title: 'Establecimientos', href: index() }],
};
