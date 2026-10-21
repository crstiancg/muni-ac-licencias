import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ORDER_STATUS_STYLES } from '@/lib/payment-orders';
import type { PaymentOrderRow } from '@/lib/payment-orders';
import { cn } from '@/lib/utils';
import { create, index, show } from '@/routes/payment-orders';
import type { Paginated } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

type Filters = {
    search: string | null;
    kind: string | null;
    status: string | null;
};

function visit({ search, kind, status }: Filters) {
    const filter = Object.fromEntries(
        Object.entries({ search, kind, status }).filter(([, value]) => value),
    );

    router.get(index().url, Object.keys(filter).length ? { filter } : {}, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        only: ['orders', 'filters'],
    });
}

/**
 * Caja: every payment order (procedures, other concepts, markets).
 */
export default function PaymentOrderIndex({
    orders,
    filters,
    kinds,
    statuses,
}: {
    orders: Paginated<PaymentOrderRow>;
    filters: Filters;
    kinds: SelectOption[];
    statuses: SelectOption[];
}) {
    return (
        <>
            <Head title="Órdenes de pago" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Órdenes de pago"
                        description="Caja: trámites, otros conceptos y mercados en un solo lugar"
                    />
                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Orden por otros conceptos
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput
                        initial={filters.search ?? ''}
                        placeholder="Código, comprobante, nombre o documento"
                        label="Buscar orden"
                        onSearch={(search) =>
                            visit({ ...filters, search: search || null })
                        }
                    />
                    <div className="w-48">
                        <FormSelect
                            id="kind"
                            name="kind"
                            options={kinds}
                            defaultValue={filters.kind}
                            emptyLabel="Todo origen"
                            onValueChange={(kind) =>
                                visit({ ...filters, kind: kind || null })
                            }
                        />
                    </div>
                    <div className="w-48">
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

                {orders.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        No hay órdenes con esos filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left text-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Orden
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Contribuyente
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Estado
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Total
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Emitida
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.data.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link
                                                href={show(order.id)}
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                    className: 'tabular-nums',
                                                })}
                                            >
                                                {order.code}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">
                                                {order.procedure
                                                    ? `Trámite ${order.procedure.code}`
                                                    : order.kind_label}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>{order.payer_name ?? '—'}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {order.payer_document}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    ORDER_STATUS_STYLES[
                                                        order.status
                                                    ],
                                                )}
                                            >
                                                {order.status_label}
                                            </Badge>
                                            {order.receipt_number && (
                                                <div className="text-xs text-muted-foreground">
                                                    Comp. {order.receipt_number}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {currency.format(
                                                Number(order.total),
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {date.format(
                                                new Date(order.created_at),
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={orders} />
            </div>
        </>
    );
}

PaymentOrderIndex.layout = {
    breadcrumbs: [{ title: 'Órdenes de pago', href: index() }],
};
