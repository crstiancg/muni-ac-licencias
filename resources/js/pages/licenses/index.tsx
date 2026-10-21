import { Head, Link, router } from '@inertiajs/react';
import { Download } from 'lucide-react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import Heading from '@/components/heading';
import LicenseStatusBadge from '@/components/license-status-badge';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { index, show } from '@/routes/licenses';
import type { LicenseStatusValue, Paginated } from '@/types';

const DEFAULT_SORT = '-issued_at';

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

type LicenseRow = {
    id: number;
    number: string;
    issued_at: string;
    holder_name: string;
    holder_document: string;
    trade_name: string | null;
    activity: string;
    address: string;
    type: string;
    type_label: string;
    status: LicenseStatusValue;
    status_label: string;
};

type Filters = {
    search: string | null;
    type: string | null;
    status: string | null;
    year: string | null;
    sort: string;
};

function params({ search, type, status, year, sort }: Filters) {
    const filter = Object.fromEntries(
        Object.entries({ search, type, status, year }).filter(
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
        only: ['licenses', 'filters'],
    });
}

/**
 * Licences and sign authorizations: replaces the old "Reporte de licencias"
 * and "Reporte de letreros", with the same filters exported to Excel.
 */
export default function LicenseIndex({
    licenses,
    filters,
    types,
    statuses,
}: {
    licenses: Paginated<LicenseRow>;
    filters: Filters;
    types: SelectOption[];
    statuses: SelectOption[];
}) {
    return (
        <>
            <Head title="Licencias" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Licencias y autorizaciones"
                        description="Documentos emitidos, verificables por QR"
                    />

                    <Button variant="outline" asChild>
                        <a
                            href={LicenseController.export.url({
                                query: params(filters),
                            })}
                        >
                            <Download />
                            Exportar a Excel
                        </a>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput
                        initial={filters.search ?? ''}
                        placeholder="N°, titular, documento, giro o dirección"
                        label="Buscar licencia"
                        onSearch={(search) =>
                            visit({ ...filters, search: search || null })
                        }
                    />
                    <div className="w-60">
                        <FormSelect
                            id="type"
                            name="type"
                            options={types}
                            defaultValue={filters.type}
                            emptyLabel="Todos los documentos"
                            onValueChange={(type) =>
                                visit({ ...filters, type: type || null })
                            }
                        />
                    </div>
                    <div className="w-44">
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
                    <Input
                        type="number"
                        className="w-28"
                        placeholder="Año"
                        aria-label="Año de emisión"
                        defaultValue={filters.year ?? ''}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                visit({
                                    ...filters,
                                    year: event.currentTarget.value || null,
                                });
                            }
                        }}
                        onBlur={(event) => {
                            if ((event.target.value || null) !== filters.year) {
                                visit({
                                    ...filters,
                                    year: event.target.value || null,
                                });
                            }
                        }}
                    />
                </div>

                {licenses.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        No hay documentos con esos filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left text-foreground">
                                <tr>
                                    <SortableHeader
                                        column="number"
                                        sort={filters.sort}
                                        onSort={(sort) =>
                                            visit({ ...filters, sort })
                                        }
                                    >
                                        N°
                                    </SortableHeader>
                                    <th className="px-4 py-3 font-medium">
                                        Titular
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Giro / dirección
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Estado
                                    </th>
                                    <SortableHeader
                                        column="issued_at"
                                        sort={filters.sort}
                                        onSort={(sort) =>
                                            visit({ ...filters, sort })
                                        }
                                    >
                                        Emisión
                                    </SortableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {licenses.data.map((license) => (
                                    <tr
                                        key={license.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link
                                                href={show(license.id)}
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                    className: 'tabular-nums',
                                                })}
                                            >
                                                {license.number}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">
                                                {license.type_label}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {license.holder_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {license.holder_document}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                {license.trade_name ??
                                                    license.activity}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {license.address}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <LicenseStatusBadge
                                                status={license.status}
                                                label={license.status_label}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {date.format(
                                                new Date(
                                                    `${license.issued_at.slice(0, 10)}T12:00:00`,
                                                ),
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={licenses} />
            </div>
        </>
    );
}

LicenseIndex.layout = {
    breadcrumbs: [{ title: 'Licencias', href: index() }],
};
