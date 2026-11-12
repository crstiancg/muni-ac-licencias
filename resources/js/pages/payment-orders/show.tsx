import { Form, Head, Link } from '@inertiajs/react';
import { Ban, Printer } from 'lucide-react';
import PaymentOrderController from '@/actions/App/Http/Controllers/PaymentOrderController';
import Heading from '@/components/heading';
import PaymentOrderStatusBadge from '@/components/payment-order-status-badge';
import RegisterPaymentDialog from '@/components/register-payment-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { PaymentOrderRow } from '@/lib/payment-orders';
import { index, show } from '@/routes/payment-orders';
import { show as showProcedure } from '@/routes/procedures';
import { show as showTaxpayer } from '@/routes/taxpayers';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

type OrderDetail = PaymentOrderRow & {
    notes: string | null;
    taxpayer_id: number | null;
    issued_by: string | null;
    items: { id: number; description: string; amount: string }[];
};

type Props = { order: OrderDetail };

export default function PaymentOrderShow({ order }: Props) {
    return (
        <>
            <Head title={`Orden ${order.code}`} />

            <div className="flex flex-col gap-5 p-4 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-2">
                        <Heading
                            title={`Orden de pago ${order.code}`}
                            description={`${order.kind_label}${order.issued_by ? ` · emitida por ${order.issued_by}` : ''}`}
                        />
                        <PaymentOrderStatusBadge
                            status={order.status}
                            label={order.status_label}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <a
                                href={PaymentOrderController.print.url(
                                    order.id,
                                )}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Printer />
                                Imprimir
                            </a>
                        </Button>
                        {order.status === 'pendiente' && (
                            <RegisterPaymentDialog
                                form={PaymentOrderController.registerPayment.form(
                                    order.id,
                                )}
                                orderCode={order.code}
                            />
                        )}
                        {order.status === 'pendiente' && !order.procedure && (
                            <Form
                                {...PaymentOrderController.cancel.form(
                                    order.id,
                                )}
                                onBefore={() =>
                                    confirm(`¿Anular la orden ${order.code}?`)
                                }
                            >
                                {({ processing }) => (
                                    <Button
                                        variant="outline"
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <Ban className="text-red-600" />
                                        )}
                                        Anular
                                    </Button>
                                )}
                            </Form>
                        )}
                    </div>
                </div>

                <section className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-3">
                    <div>
                        <div className="text-xs text-muted-foreground">
                            Contribuyente
                        </div>
                        {order.taxpayer_id ? (
                            <Link
                                href={showTaxpayer(order.taxpayer_id)}
                                className="font-semibold hover:text-link hover:underline"
                            >
                                {order.payer_name}
                            </Link>
                        ) : (
                            <div className="text-sm">{order.payer_name}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                            {order.payer_document}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">
                            Origen
                        </div>
                        <div className="text-sm">
                            {order.procedure ? (
                                <Link
                                    href={showProcedure(order.procedure.id)}
                                    className="font-semibold hover:text-link hover:underline"
                                >
                                    Trámite {order.procedure.code}
                                </Link>
                            ) : (
                                order.kind_label
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">
                            Pago
                        </div>
                        <div className="text-sm">
                            {order.receipt_number
                                ? `Comprobante ${order.receipt_number}`
                                : '—'}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border bg-card p-6">
                    <ul className="divide-y">
                        {order.items.map((item) => (
                            <li
                                key={item.id}
                                className="flex justify-between gap-4 py-2 text-sm"
                            >
                                <span>{item.description}</span>
                                <span className="tabular-nums">
                                    {currency.format(Number(item.amount))}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 flex justify-between border-t pt-3 font-semibold tabular-nums">
                        <span>Total</span>
                        <span>{currency.format(Number(order.total))}</span>
                    </div>
                    {order.notes && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            {order.notes}
                        </p>
                    )}
                </section>
            </div>
        </>
    );
}

PaymentOrderShow.layout = ({ order }: Props) => ({
    breadcrumbs: [
        { title: 'Órdenes de pago', href: index() },
        { title: order.code, href: show(order.id) },
    ],
});
