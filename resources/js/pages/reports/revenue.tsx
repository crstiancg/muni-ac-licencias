import { Head, router } from '@inertiajs/react';
import { Download } from 'lucide-react';
import RevenueReportController from '@/actions/App/Http/Controllers/RevenueReportController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { revenue } from '@/routes/reports';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const date = new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
});

type Row = { quantity: number; total: string };

/**
 * Revenue of paid payment orders in a date range, by procedure type and by
 * day, exportable to Excel.
 */
export default function RevenueReport({
    filters,
    summary,
    byType,
    byDay,
}: {
    filters: { from: string; to: string };
    summary: {
        total: string;
        orders: number;
        exonerated: number;
        pending: string;
    };
    byType: (Row & { description: string })[];
    byDay: (Row & { date: string })[];
}) {
    const visit = (next: Partial<typeof filters>) =>
        router.get(
            revenue().url,
            { ...filters, ...next },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    const max = Math.max(...byDay.map((day) => Number(day.total)), 1);

    return (
        <>
            <Head title="Recaudación" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-end justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Recaudación"
                        description="Órdenes de pago pagadas en Caja por fecha de pago"
                    />
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="grid gap-1">
                            <Label htmlFor="from">Desde</Label>
                            <Input
                                id="from"
                                type="date"
                                defaultValue={filters.from}
                                onChange={(event) =>
                                    event.target.value &&
                                    visit({ from: event.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="to">Hasta</Label>
                            <Input
                                id="to"
                                type="date"
                                defaultValue={filters.to}
                                onChange={(event) =>
                                    event.target.value &&
                                    visit({ to: event.target.value })
                                }
                            />
                        </div>
                        <Button variant="outline" asChild>
                            <a
                                href={RevenueReportController.export.url({
                                    query: filters,
                                })}
                            >
                                <Download />
                                Exportar a Excel
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat
                        label="Recaudado"
                        value={currency.format(Number(summary.total))}
                    />
                    <Stat label="Órdenes pagadas" value={summary.orders} />
                    <Stat
                        label="Exonerados"
                        value={summary.exonerated}
                        hint="Trámites de S/ 0.00"
                    />
                    <Stat
                        label="Pendiente de pago"
                        value={currency.format(Number(summary.pending))}
                        hint="Todas las órdenes sin pagar"
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <section className="rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border">
                        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                            Por tipo de trámite
                        </h2>
                        {byType.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Sin pagos en el período.
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="text-left text-muted-foreground">
                                    <tr>
                                        <th className="py-2 font-medium">
                                            Concepto
                                        </th>
                                        <th className="py-2 text-right font-medium">
                                            Cant.
                                        </th>
                                        <th className="py-2 text-right font-medium">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {byType.map((row) => (
                                        <tr key={row.description}>
                                            <td className="py-2 pr-3">
                                                {row.description}
                                            </td>
                                            <td className="py-2 text-right tabular-nums">
                                                {row.quantity}
                                            </td>
                                            <td className="py-2 text-right whitespace-nowrap tabular-nums">
                                                {currency.format(
                                                    Number(row.total),
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    <section className="rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border">
                        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                            Por día
                        </h2>
                        {byDay.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Sin pagos en el período.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {byDay.map((day) => (
                                    <li
                                        key={day.date}
                                        className="grid grid-cols-[6rem_1fr_7rem] items-center gap-3 text-sm"
                                    >
                                        <span className="text-muted-foreground capitalize">
                                            {date.format(
                                                new Date(
                                                    `${day.date}T12:00:00`,
                                                ),
                                            )}
                                        </span>
                                        <span className="h-2 rounded-full bg-muted">
                                            <span
                                                className="block h-2 rounded-full bg-primary"
                                                style={{
                                                    width: `${(Number(day.total) / max) * 100}%`,
                                                }}
                                            />
                                        </span>
                                        <span className="text-right tabular-nums">
                                            {currency.format(Number(day.total))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

function Stat({
    label,
    value,
    hint,
}: {
    label: string;
    value: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
                {value}
            </div>
            {hint && (
                <div className="text-xs text-muted-foreground">{hint}</div>
            )}
        </div>
    );
}

RevenueReport.layout = {
    breadcrumbs: [{ title: 'Recaudación', href: revenue() }],
};
