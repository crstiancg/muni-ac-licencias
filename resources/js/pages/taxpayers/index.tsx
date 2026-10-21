import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { create, index, show } from '@/routes/taxpayers';
import type { Paginated, Taxpayer } from '@/types';

const DEFAULT_SORT = 'name';

const DOCUMENT_LABELS: Record<Taxpayer['document_type'], string> = {
    dni: 'DNI',
    ce: 'CE',
    ruc: 'RUC',
};

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
            only: ['taxpayers', 'filters'],
        },
    );
}

export default function TaxpayerIndex({
    taxpayers,
    filters,
}: {
    taxpayers: Paginated<Taxpayer>;
    filters: Filters;
}) {
    const sortBy = (sort: string) => visit({ ...filters, sort });

    return (
        <>
            <Head title="Contribuyentes" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Contribuyentes"
                        description="Personas naturales y jurídicas que solicitan trámites"
                    />

                    <Button asChild data-test="create-taxpayer-button">
                        <Link href={create()}>
                            <Plus />
                            Registrar contribuyente
                        </Link>
                    </Button>
                </div>

                <SearchInput
                    initial={filters.search ?? ''}
                    placeholder="Buscar por DNI, RUC o nombre"
                    label="Buscar contribuyente"
                    onSearch={(search) =>
                        visit({ ...filters, search: search || null })
                    }
                />

                {taxpayers.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        {filters.search
                            ? `No hay contribuyentes que coincidan con “${filters.search}”.`
                            : 'Aún no hay contribuyentes registrados.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left text-foreground">
                                <tr>
                                    <SortableHeader
                                        column="document_number"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Documento
                                    </SortableHeader>
                                    <SortableHeader
                                        column="name"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Nombre o razón social
                                    </SortableHeader>
                                    <th className="px-4 py-3 font-medium">
                                        Domicilio fiscal
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Teléfono
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {taxpayers.data.map((taxpayer) => (
                                    <tr
                                        key={taxpayer.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                                            <div>
                                                <span className="mr-1 text-muted-foreground">
                                                    {
                                                        DOCUMENT_LABELS[
                                                            taxpayer
                                                                .document_type
                                                        ]
                                                    }
                                                </span>
                                                {taxpayer.document_number}
                                            </div>
                                            {taxpayer.ruc && (
                                                <div className="text-xs text-muted-foreground">
                                                    RUC {taxpayer.ruc}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={show(taxpayer.id)}
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                })}
                                            >
                                                {taxpayer.name}
                                            </Link>
                                            {taxpayer.document_type === 'ruc' &&
                                                taxpayer.document_number.startsWith(
                                                    '20',
                                                ) && (
                                                    <div>
                                                        <Badge
                                                            variant="outline"
                                                            className="mt-1"
                                                        >
                                                            Persona jurídica
                                                        </Badge>
                                                    </div>
                                                )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {taxpayer.address ?? '—'}
                                            {taxpayer.district &&
                                                ` · ${taxpayer.district}`}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {taxpayer.phone ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={taxpayers} />
            </div>
        </>
    );
}

TaxpayerIndex.layout = {
    breadcrumbs: [{ title: 'Contribuyentes', href: index() }],
};
