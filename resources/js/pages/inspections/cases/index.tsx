import { Form, Head, Link, router } from '@inertiajs/react';
import { CalendarClock, ChevronRight, MapPin, Search } from 'lucide-react';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    caseTone,
    formatDate,
    type InspectionCaseRow,
} from '@/lib/inspections';
import { cn } from '@/lib/utils';
import { index as casesIndex, show } from '@/routes/inspections/cases';
import { index } from '@/routes/inspections';
import type { Paginated } from '@/types';

type Props = {
    cases: Paginated<InspectionCaseRow>;
    filters: { status: string; search: string | null };
    statusOptions: { value: string; label: string }[];
    counts: { overdue: number };
};

export default function InspectionCasesIndex({
    cases,
    filters,
    statusOptions,
    counts,
}: Props) {
    const filter = (changes: Partial<Props['filters']>) => {
        const next = { ...filters, ...changes };

        router.get(
            casesIndex.url({
                query: {
                    filter: {
                        status: next.status,
                        search: next.search || undefined,
                    },
                },
            }),
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <>
            <Head title="Negocios sin licencia" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-8">
                <Heading
                    title="Negocios sin licencia"
                    description="Seguimiento de los negocios encontrados funcionando sin licencia: se notifican con un plazo y se cierran cuando la obtienen."
                />

                <Form action={casesIndex()} method="get" className="flex gap-2">
                    <input
                        type="hidden"
                        name="filter[status]"
                        value={filters.status}
                    />
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            name="filter[search]"
                            type="search"
                            defaultValue={filters.search ?? ''}
                            enterKeyHint="search"
                            placeholder="Negocio, responsable, DNI/RUC, dirección o código"
                            className="h-12 pl-10 text-base"
                        />
                    </div>
                    <Button type="submit" size="lg" className="h-12">
                        Buscar
                    </Button>
                </Form>

                <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {statusOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => filter({ status: option.value })}
                            className={cn(
                                'shrink-0 rounded-full border px-3 py-1 text-sm',
                                filters.status === option.value
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'bg-card text-muted-foreground',
                            )}
                        >
                            {option.label}
                            {option.value === 'vencido' &&
                                counts.overdue > 0 &&
                                ` (${counts.overdue})`}
                        </button>
                    ))}
                </div>

                {cases.data.length === 0 ? (
                    <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No hay casos con estos filtros.
                    </p>
                ) : (
                    <ul className="divide-y rounded-2xl border bg-card">
                        {cases.data.map((row) => (
                            <li key={row.id}>
                                <Link
                                    href={show(row.id)}
                                    className="flex items-center gap-3 p-4 hover:bg-accent/50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate font-semibold">
                                                {row.business_name}
                                            </span>
                                            <StatusPill tone={caseTone(row)}>
                                                {row.status_label}
                                            </StatusPill>
                                        </div>
                                        <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                                            <MapPin className="size-3.5 shrink-0" />
                                            {row.address}
                                        </p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                                            <span className="font-mono">
                                                {row.code}
                                            </span>
                                            {row.activity && (
                                                <span>· {row.activity}</span>
                                            )}
                                            <span>
                                                · {row.inspections_count}{' '}
                                                {row.inspections_count === 1
                                                    ? 'visita'
                                                    : 'visitas'}
                                            </span>
                                            {row.is_open && row.deadline && (
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1',
                                                        row.is_overdue &&
                                                            'font-semibold text-destructive',
                                                    )}
                                                >
                                                    ·{' '}
                                                    <CalendarClock className="size-3.5" />
                                                    Plazo{' '}
                                                    {formatDate(row.deadline)}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                <Pagination paginator={cases} />
            </div>
        </>
    );
}

InspectionCasesIndex.layout = {
    breadcrumbs: [
        { title: 'Fiscalización', href: index() },
        { title: 'Negocios sin licencia', href: casesIndex() },
    ],
};
