import { Head, Link } from '@inertiajs/react';
import {
    BadgeCheck,
    FilePlus,
    FileText,
    Receipt,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import Heading from '@/components/heading';
import ProcedureStatusBadge from '@/components/procedure-status-badge';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { index as itseIndex } from '@/routes/itse';
import { index as licensesIndex } from '@/routes/licenses';
import { create, index, show } from '@/routes/procedures';
import type { ProcedureStatusValue } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const dateTime = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
});

type Stats = {
    registered: number;
    liquidated: number;
    paid: number;
    pending_amount: string;
    revenue_month: string;
    payments_month: number;
    licenses_year: number;
    licenses_active: number;
    itse_expiring: number;
    itse_expired: number;
};

type RecentProcedure = {
    id: number;
    code: string;
    created_at: string;
    status: ProcedureStatusValue;
    status_label: string;
    taxpayer: string;
};

export default function Dashboard({
    stats,
    recent,
}: {
    stats: Stats;
    recent: RecentProcedure[];
}) {
    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Panel"
                        description="Lo que está pendiente en cada paso del trámite"
                    />
                    <Button asChild>
                        <Link href={create()}>
                            <FilePlus />
                            Nuevo trámite
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Stat
                        icon={<FileText />}
                        label="Por liquidar"
                        value={stats.registered}
                        hint="Trámites sin orden de pago"
                        href={
                            index({
                                query: { filter: { status: 'registrado' } },
                            }).url
                        }
                    />
                    <Stat
                        icon={<Receipt />}
                        label="Por pagar"
                        value={stats.liquidated}
                        hint={`${currency.format(Number(stats.pending_amount))} en órdenes pendientes`}
                        href={
                            index({
                                query: { filter: { status: 'liquidado' } },
                            }).url
                        }
                    />
                    <Stat
                        icon={<BadgeCheck />}
                        label="Por emitir"
                        value={stats.paid}
                        hint="Pagados, falta emitir el documento"
                        href={
                            index({ query: { filter: { status: 'pagado' } } })
                                .url
                        }
                    />
                    <Stat
                        icon={<Wallet />}
                        label="Recaudado este mes"
                        value={currency.format(Number(stats.revenue_month))}
                        hint={`${stats.payments_month} pagos registrados`}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <section className="rounded-xl border border-sidebar-border/70 p-5 lg:col-span-2 dark:border-sidebar-border">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-muted-foreground">
                                Últimos trámites
                            </h2>
                            <Link
                                href={index()}
                                className="text-sm underline-offset-4 hover:underline"
                            >
                                Ver todos
                            </Link>
                        </div>
                        {recent.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aún no hay trámites en el sistema nuevo.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {recent.map((procedure) => (
                                    <li key={procedure.id}>
                                        <Link
                                            href={show(procedure.id)}
                                            className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                                        >
                                            <span className="min-w-0 truncate">
                                                <span className="font-medium tabular-nums">
                                                    {procedure.code}
                                                </span>{' '}
                                                {procedure.taxpayer}
                                            </span>
                                            <span className="flex shrink-0 items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {dateTime.format(
                                                        new Date(
                                                            procedure.created_at,
                                                        ),
                                                    )}
                                                </span>
                                                <ProcedureStatusBadge
                                                    status={procedure.status}
                                                    label={
                                                        procedure.status_label
                                                    }
                                                />
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="flex flex-col gap-4">
                        <Stat
                            icon={<BadgeCheck />}
                            label="Licencias vigentes"
                            value={stats.licenses_active.toLocaleString(
                                'es-PE',
                            )}
                            hint="Incluye las del sistema anterior"
                            href={
                                licensesIndex({
                                    query: { filter: { status: 'vigente' } },
                                }).url
                            }
                        />
                        <Stat
                            icon={<ShieldCheck />}
                            label="ITSE por vencer"
                            value={stats.itse_expiring}
                            hint={`En los próximos 60 días · ${stats.itse_expired} ya vencidos`}
                            href={
                                itseIndex({
                                    query: { filter: { state: 'por_vencer' } },
                                }).url
                            }
                        />
                        <Stat
                            icon={<FilePlus />}
                            label={`Emitidas en ${new Date().getFullYear()}`}
                            value={stats.licenses_year}
                            hint="Licencias y autorizaciones del sistema nuevo"
                        />
                    </section>
                </div>
            </div>
        </>
    );
}

function Stat({
    icon,
    label,
    value,
    hint,
    href,
}: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    hint: string;
    href?: string;
}) {
    const content = (
        <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4">
                {icon}
                {label}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">
                {value}
            </div>
            <div className="text-xs text-muted-foreground">{hint}</div>
        </>
    );

    const className =
        'block rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border';

    return href ? (
        <Link href={href} className={`${className} hover:bg-muted/30`}>
            {content}
        </Link>
    ) : (
        <div className={className}>{content}</div>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Panel', href: dashboard() }],
};
