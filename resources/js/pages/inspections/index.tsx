import { Form, Head, Link, router } from '@inertiajs/react';
import { Camera, ChevronRight, MapPin, Search, Store } from 'lucide-react';
import Heading from '@/components/heading';
import LicenseStatusBadge, {
    LicensePendingBadge,
} from '@/components/license-status-badge';
import Pagination from '@/components/pagination';
import QrScanDialog from '@/components/qr-scan-dialog';
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    formatDateTime,
    RESULT_TONES,
    type InspectedLicense,
    type InspectionRow,
} from '@/lib/inspections';
import { cn } from '@/lib/utils';
import { create, index, show } from '@/routes/inspections';
import type { LicenseStatusValue, Paginated } from '@/types';

type Props = {
    search: string;
    results: InspectedLicense[] | null;
    inspections: Paginated<InspectionRow>;
    filters: { search: string | null; result: string | null; mine: boolean };
    resultOptions: { value: string; label: string }[];
    counts: { today: number; without_license: number };
};

export default function InspectionsIndex({
    search,
    results,
    inspections,
    filters,
    resultOptions,
    counts,
}: Props) {
    const filter = (changes: Partial<Props['filters']>) => {
        const next = { ...filters, ...changes };

        router.get(
            index.url({
                query: {
                    filter: {
                        search: next.search || undefined,
                        result: next.result || undefined,
                        mine: next.mine ? 1 : undefined,
                    },
                },
            }),
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    return (
        <>
            <Head title="Fiscalización" />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-8">
                <Heading
                    title="Fiscalización"
                    description={`Hoy registraste ${counts.today} ${counts.today === 1 ? 'visita' : 'visitas'}.`}
                />

                <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                    <div className="flex gap-3">
                        <QrScanDialog />
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-14 flex-1 text-base"
                            asChild
                        >
                            <Link href={create()}>
                                <Store className="size-5" />
                                Sin licencia
                            </Link>
                        </Button>
                    </div>

                    <Form action={index()} method="get" className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                name="search"
                                type="search"
                                defaultValue={search}
                                enterKeyHint="search"
                                placeholder="RUC, DNI, nombre, dirección o N° de licencia"
                                className="h-12 pl-10 text-base"
                            />
                        </div>
                        <Button type="submit" size="lg" className="h-12">
                            Buscar
                        </Button>
                    </Form>
                    <p className="text-xs text-muted-foreground">
                        Busca entre las licencias emitidas por este sistema y
                        las migradas del sistema anterior.
                    </p>
                </section>

                {results !== null && (
                    <section className="flex flex-col gap-3">
                        <h2 className="font-display text-lg font-bold">
                            {results.length === 0
                                ? `Sin licencias para "${search}"`
                                : `Licencias para "${search}"`}
                        </h2>

                        {results.length === 0 ? (
                            <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed p-5 text-sm">
                                <p className="text-muted-foreground">
                                    Prueba con otro dato (RUC, DNI, parte del
                                    nombre o de la dirección). Si el negocio no
                                    tiene licencia, regístralo para hacerle
                                    seguimiento.
                                </p>
                                <Button variant="outline" asChild>
                                    <Link href={create()}>
                                        <Store />
                                        Registrar negocio sin licencia
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {results.map((license) => (
                                    <li key={license.id}>
                                        <LicenseResult license={license} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                <section className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-display text-lg font-bold">
                            Visitas registradas
                        </h2>
                        <div className="flex rounded-lg border p-0.5 text-sm">
                            {[
                                { label: 'Todas', mine: false },
                                { label: 'Mías', mine: true },
                            ].map((option) => (
                                <button
                                    key={option.label}
                                    type="button"
                                    onClick={() =>
                                        filter({ mine: option.mine })
                                    }
                                    className={cn(
                                        'rounded-md px-3 py-1 font-medium',
                                        filters.mine === option.mine
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {[{ value: '', label: 'Todos' }, ...resultOptions].map(
                            (option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        filter({ result: option.value || null })
                                    }
                                    className={cn(
                                        'shrink-0 rounded-full border px-3 py-1 text-sm',
                                        (filters.result ?? '') === option.value
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'bg-card text-muted-foreground',
                                    )}
                                >
                                    {option.label}
                                    {option.value === 'sin_licencia' &&
                                        counts.without_license > 0 &&
                                        ` (${counts.without_license})`}
                                </button>
                            ),
                        )}
                    </div>

                    {inspections.data.length === 0 ? (
                        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No hay visitas con estos filtros.
                        </p>
                    ) : (
                        <ul className="divide-y rounded-2xl border bg-card">
                            {inspections.data.map((inspection) => (
                                <li key={inspection.id}>
                                    <Link
                                        href={show(inspection.id)}
                                        className="flex items-center gap-3 p-4 hover:bg-accent/50"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate font-semibold">
                                                    {inspection.business_name ??
                                                        'Sin nombre'}
                                                </span>
                                                <StatusPill
                                                    tone={
                                                        RESULT_TONES[
                                                            inspection.result
                                                        ]
                                                    }
                                                >
                                                    {inspection.result_label}
                                                </StatusPill>
                                            </div>
                                            {inspection.address && (
                                                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                                                    <MapPin className="size-3.5 shrink-0" />
                                                    {inspection.address}
                                                </p>
                                            )}
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                <span className="font-mono">
                                                    {inspection.code}
                                                </span>
                                                {' · '}
                                                {formatDateTime(
                                                    inspection.visited_at,
                                                )}
                                                {' · '}
                                                {inspection.inspector}
                                            </p>
                                        </div>
                                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Pagination paginator={inspections} />
                </section>
            </div>
        </>
    );
}

function LicenseResult({ license }: { license: InspectedLicense }) {
    return (
        <Link
            href={create({ query: { license: license.id } })}
            className={cn(
                'flex items-center gap-3 rounded-2xl border border-l-4 bg-card p-4 hover:bg-accent/50',
                license.is_valid ? 'border-l-[#12a06f]' : 'border-l-[#d9473b]',
            )}
        >
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                        {license.trade_name ?? license.holder_name}
                    </span>
                    <LicenseStatusBadge
                        status={license.status as LicenseStatusValue}
                        label={license.status_label}
                    />
                    {license.needs_confirmation && <LicensePendingBadge />}
                </div>
                {license.trade_name && (
                    <p className="text-sm">{license.holder_name}</p>
                )}
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    {license.address}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="font-mono">{license.number}</span>
                    {license.series && ` · Serie ${license.series}`}
                    {' · '}
                    {license.activity}
                    {license.is_legacy && ' · Sistema anterior'}
                </p>
            </div>
            <span className="flex shrink-0 flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground">
                <Camera className="size-5" />
                Visitar
            </span>
        </Link>
    );
}

InspectionsIndex.layout = {
    breadcrumbs: [{ title: 'Fiscalización', href: index() }],
};
