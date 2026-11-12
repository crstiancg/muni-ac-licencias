import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
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
import { cn } from '@/lib/utils';
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
            <Head title="Panel" />

            <div className="flex flex-col gap-5 p-4 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
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

                <section
                    aria-label="Trámites en curso"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
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
                        featured
                    />
                </section>

                <div className="grid gap-5 lg:grid-cols-3">
                    <section className="flex flex-col rounded-2xl border bg-card lg:col-span-2">
                        <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                            <h2 className="text-lg font-bold">
                                Últimos trámites
                            </h2>
                            <Link
                                href={index()}
                                className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline"
                            >
                                Ver todos
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                        {recent.length === 0 ? (
                            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                                Aún no hay trámites en el sistema nuevo.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {recent.map((procedure) => (
                                    <li key={procedure.id}>
                                        <Link
                                            href={show(procedure.id)}
                                            className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
                                        >
                                            <span className="min-w-0">
                                                <span className="block font-mono text-sm font-semibold">
                                                    {procedure.code}
                                                </span>
                                                <span className="block truncate text-sm text-muted-foreground">
                                                    {procedure.taxpayer}
                                                </span>
                                            </span>
                                            <span className="flex shrink-0 flex-col items-end gap-1">
                                                <ProcedureStatusBadge
                                                    status={procedure.status}
                                                    label={
                                                        procedure.status_label
                                                    }
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    {dateTime.format(
                                                        new Date(
                                                            procedure.created_at,
                                                        ),
                                                    )}
                                                </span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section
                        aria-label="Licencias e ITSE"
                        className="flex flex-col gap-4"
                    >
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

/**
 * One figure of the day. "Featured" is the graphite tile with the gold
 * signature, reserved for the month's revenue.
 */
function Stat({
    icon,
    label,
    value,
    hint,
    href,
    featured = false,
}: {
    icon: ReactNode;
    label: string;
    value: ReactNode;
    hint: string;
    href?: string;
    featured?: boolean;
}) {
    const content = (
        <>
            <div className="flex items-center justify-between gap-3">
                <span
                    className={cn(
                        'text-sm font-semibold',
                        featured
                            ? 'text-sidebar-foreground'
                            : 'text-muted-foreground',
                    )}
                >
                    {label}
                </span>
                <span
                    className={cn(
                        'flex size-9 items-center justify-center rounded-xl [&_svg]:size-4',
                        featured
                            ? 'bg-sidebar-accent text-gold'
                            : 'bg-accent text-link',
                    )}
                >
                    {icon}
                </span>
            </div>
            <div
                className={cn(
                    'mt-3 font-display text-3xl font-bold tabular-nums',
                    featured && 'text-white',
                )}
            >
                {value}
            </div>
            <div
                className={cn(
                    'mt-1 text-sm',
                    featured
                        ? 'text-sidebar-foreground'
                        : 'text-muted-foreground',
                )}
            >
                {hint}
            </div>
        </>
    );

    const className = cn(
        'block rounded-2xl p-5',
        featured ? 'bg-sidebar' : 'border bg-card',
    );

    return href ? (
        <Link
            href={href}
            className={cn(
                className,
                'transition-colors hover:border-gold-strong',
            )}
        >
            {content}
        </Link>
    ) : (
        <div className={className}>{content}</div>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Panel', href: dashboard() }],
};
