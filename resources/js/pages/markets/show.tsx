import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
    create as createStall,
    show as showStall,
} from '@/routes/market-stalls';
import { index, show } from '@/routes/markets';
import type { Paginated } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

type Market = {
    id: number;
    name: string;
    payment_frequency: 'anual' | 'mensual';
};

type StallRow = {
    id: number;
    code: string;
    stall_type: string | null;
    activity: string | null;
    fee: string | null;
    holder_name: string | null;
    holder_document: string | null;
    status: string;
    debt: string | null;
};

type Filters = { search: string | null; status: string | null; debt: boolean };

type Props = {
    market: Market;
    stalls: Paginated<StallRow>;
    filters: Filters;
    statuses: SelectOption[];
};

export default function MarketShow({
    market,
    stalls,
    filters,
    statuses,
}: Props) {
    const visit = ({ search, status, debt }: Filters) => {
        const filter = {
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
            ...(debt ? { debt: 1 } : {}),
        };

        router.get(
            show(market.id).url,
            Object.keys(filter).length ? { filter } : {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['stalls', 'filters'],
            },
        );
    };

    return (
        <>
            <Head title={`Mercado ${market.name}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title={`Mercado ${market.name}`}
                        description={`Cuota ${market.payment_frequency} por puesto`}
                    />
                    <Button asChild>
                        <Link
                            href={createStall({ query: { market: market.id } })}
                        >
                            <Plus />
                            Nuevo puesto
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput
                        initial={filters.search ?? ''}
                        placeholder="N° de puesto, titular o giro"
                        label="Buscar puesto"
                        onSearch={(search) =>
                            visit({ ...filters, search: search || null })
                        }
                    />
                    <div className="w-44">
                        <FormSelect
                            id="status"
                            name="status"
                            options={statuses}
                            defaultValue={filters.status}
                            emptyLabel="Todo estado"
                            onValueChange={(status) =>
                                visit({ ...filters, status: status || null })
                            }
                        />
                    </div>
                    <Toggle
                        variant="outline"
                        pressed={filters.debt}
                        onPressedChange={(debt) => visit({ ...filters, debt })}
                    >
                        Solo con deuda
                    </Toggle>
                </div>

                {stalls.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        No hay puestos con esos filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left text-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Puesto
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Titular
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Giro
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Cuota
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Deuda
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {stalls.data.map((stall) => (
                                    <tr
                                        key={stall.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link
                                                href={showStall(stall.id)}
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                })}
                                            >
                                                {stall.code}
                                            </Link>
                                            {stall.status !== 'activo' && (
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-2"
                                                >
                                                    {stall.status}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {stall.holder_name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {stall.activity ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {stall.fee
                                                ? currency.format(
                                                      Number(stall.fee),
                                                  )
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {Number(stall.debt ?? 0) > 0 ? (
                                                <span className="font-medium text-red-700 dark:text-red-300">
                                                    {currency.format(
                                                        Number(stall.debt),
                                                    )}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={stalls} />
            </div>
        </>
    );
}

MarketShow.layout = ({ market }: Props) => ({
    breadcrumbs: [
        { title: 'Mercados', href: index() },
        { title: market.name, href: show(market.id) },
    ],
});
