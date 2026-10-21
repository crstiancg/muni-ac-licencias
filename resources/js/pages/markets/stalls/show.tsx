import { Head, Link, useForm } from '@inertiajs/react';
import { Pencil, Receipt } from 'lucide-react';
import MarketStallController from '@/actions/App/Http/Controllers/MarketStallController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { edit } from '@/routes/market-stalls';
import { index, show as showMarket } from '@/routes/markets';
import { show as showOrder } from '@/routes/payment-orders';
import { show as showTaxpayer } from '@/routes/taxpayers';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

type Stall = {
    id: number;
    code: string;
    type_label: string | null;
    activity: string | null;
    fee: string | null;
    holder_name: string | null;
    holder_document: string | null;
    status: string;
    status_label: string;
    notes: string | null;
    legacy_id: number | null;
    market: { id: number; name: string; payment_frequency: string };
    taxpayer: { id: number; name: string } | null;
};

type Charge = {
    id: number;
    period: string;
    amount: string;
    paid_at: string | null;
    receipt_number: string | null;
    order: { id: number; code: string } | null;
};

type Props = { stall: Stall; charges: Charge[]; debt: string };

/**
 * The stall's file: pick unpaid charges and bill them into one payment order.
 */
export default function StallShow({ stall, charges, debt }: Props) {
    const form = useForm<{ charge_ids: number[] }>({ charge_ids: [] });
    const billable = charges.filter(
        (charge) => !charge.paid_at && !charge.order,
    );
    const selectedTotal = charges
        .filter((charge) => form.data.charge_ids.includes(charge.id))
        .reduce((sum, charge) => sum + Number(charge.amount), 0);

    const toggle = (id: number) =>
        form.setData(
            'charge_ids',
            form.data.charge_ids.includes(id)
                ? form.data.charge_ids.filter((value) => value !== id)
                : [...form.data.charge_ids, id],
        );

    return (
        <>
            <Head title={`Puesto ${stall.code}`} />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Heading
                            title={`Puesto ${stall.code}`}
                            description={`Mercado ${stall.market.name} · cuota ${stall.market.payment_frequency}`}
                        />
                        <div className="flex gap-1">
                            <Badge variant="outline">
                                {stall.status_label}
                            </Badge>
                            {stall.type_label && (
                                <Badge variant="outline">
                                    {stall.type_label}
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={edit(stall.id)}>
                            <Pencil />
                            Editar
                        </Link>
                    </Button>
                </div>

                <section className="grid gap-4 rounded-xl border border-sidebar-border/70 p-6 sm:grid-cols-4 dark:border-sidebar-border">
                    <div>
                        <div className="text-xs text-muted-foreground">
                            Titular
                        </div>
                        {stall.taxpayer ? (
                            <Link
                                href={showTaxpayer(stall.taxpayer.id)}
                                className="text-sm hover:underline"
                            >
                                {stall.taxpayer.name}
                            </Link>
                        ) : (
                            <div className="text-sm">
                                {stall.holder_name ?? '—'}
                                {!stall.holder_name && ' (registrar titular)'}
                            </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                            {stall.holder_document}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">
                            Giro
                        </div>
                        <div className="text-sm">{stall.activity ?? '—'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">
                            Cuota
                        </div>
                        <div className="text-sm">
                            {stall.fee
                                ? currency.format(Number(stall.fee))
                                : 'Sin cuota registrada'}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">
                            Deuda
                        </div>
                        <div className="text-sm font-semibold text-red-700 dark:text-red-300">
                            {currency.format(Number(debt))}
                        </div>
                    </div>
                    {stall.notes && (
                        <p className="text-sm text-muted-foreground sm:col-span-4">
                            {stall.notes}
                        </p>
                    )}
                </section>

                <section className="rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-muted-foreground">
                            Cuotas ({charges.length})
                        </h2>
                        {billable.length > 0 && (
                            <div className="flex items-center gap-3">
                                <span className="text-sm tabular-nums">
                                    Seleccionado:{' '}
                                    {currency.format(selectedTotal)}
                                </span>
                                <Button
                                    disabled={
                                        form.processing ||
                                        form.data.charge_ids.length === 0
                                    }
                                    onClick={() =>
                                        form.submit(
                                            MarketStallController.bill(
                                                stall.id,
                                            ),
                                        )
                                    }
                                >
                                    {form.processing ? (
                                        <Spinner />
                                    ) : (
                                        <Receipt />
                                    )}
                                    Generar orden de pago
                                </Button>
                            </div>
                        )}
                    </div>
                    <InputError
                        message={
                            (form.errors as Record<string, string | undefined>)
                                .charges ?? form.errors.charge_ids
                        }
                        className="mb-2"
                    />

                    {charges.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            Sin cuotas. Se generan desde Mercados → Cuotas.
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground">
                                <tr>
                                    <th className="w-8 py-2" />
                                    <th className="py-2 font-medium">
                                        Período
                                    </th>
                                    <th className="py-2 text-right font-medium">
                                        Importe
                                    </th>
                                    <th className="py-2 pl-4 font-medium">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {charges.map((charge) => {
                                    const canBill =
                                        !charge.paid_at && !charge.order;

                                    return (
                                        <tr key={charge.id}>
                                            <td className="py-2">
                                                {canBill && (
                                                    <input
                                                        type="checkbox"
                                                        checked={form.data.charge_ids.includes(
                                                            charge.id,
                                                        )}
                                                        onChange={() =>
                                                            toggle(charge.id)
                                                        }
                                                        aria-label={`Cobrar ${charge.period}`}
                                                        className="size-4 accent-primary"
                                                    />
                                                )}
                                            </td>
                                            <td className="py-2">
                                                {charge.period}
                                            </td>
                                            <td className="py-2 text-right tabular-nums">
                                                {currency.format(
                                                    Number(charge.amount),
                                                )}
                                            </td>
                                            <td className="py-2 pl-4">
                                                {charge.paid_at ? (
                                                    <span className="text-emerald-700 dark:text-emerald-300">
                                                        Pagado{' '}
                                                        {date.format(
                                                            new Date(
                                                                `${charge.paid_at.slice(0, 10)}T12:00:00`,
                                                            ),
                                                        )}
                                                        {charge.receipt_number &&
                                                            ` · ${charge.receipt_number}`}
                                                    </span>
                                                ) : charge.order ? (
                                                    <Link
                                                        href={showOrder(
                                                            charge.order.id,
                                                        )}
                                                        className="text-amber-700 underline underline-offset-4 dark:text-amber-300"
                                                    >
                                                        En orden{' '}
                                                        {charge.order.code}
                                                    </Link>
                                                ) : (
                                                    <span className="text-red-700 dark:text-red-300">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>
        </>
    );
}

StallShow.layout = ({ stall }: Props) => ({
    breadcrumbs: [
        { title: 'Mercados', href: index() },
        { title: stall.market.name, href: showMarket(stall.market.id) },
        { title: `Puesto ${stall.code}`, href: index() },
    ],
});
