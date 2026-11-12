import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeCheck,
    Check,
    Copy,
    ExternalLink,
    FilePlus2,
    History,
    Printer,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import EditLicenseSeries from '@/components/edit-license-series';
import InputError from '@/components/input-error';
import LicenseStatusBadge, {
    LicensePendingBadge,
} from '@/components/license-status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/licenses';
import {
    create as createProcedure,
    show as showProcedure,
} from '@/routes/procedures';
import { show as showTaxpayer } from '@/routes/taxpayers';
import type { LicenseStatusValue } from '@/types';

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' });

const formatDate = (value: string) =>
    date.format(new Date(`${value.slice(0, 10)}T12:00:00`));

const textareaClass =
    'flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm';

/** What each status change means, shown on its button. */
const TRANSITION_HINTS: Partial<Record<LicenseStatusValue, string>> = {
    vigente: 'El establecimiento vuelve a funcionar.',
    cese_temporal: 'Deja de operar por un tiempo; puede reactivarse.',
    cese_definitivo: 'Cierre definitivo del establecimiento.',
    anulada: 'Deja sin efecto la licencia. Requiere motivo.',
    caducada: 'Venció su plazo de vigencia.',
};

type LicenseDetail = {
    id: number;
    number: string;
    issued_at: string;
    valid_until: string | null;
    series: string | null;
    holder_name: string;
    holder_document: string;
    trade_name: string | null;
    activity: string;
    address: string;
    area: string | null;
    capacity: number | null;
    risk_level: string | null;
    type: string;
    type_label: string;
    status: LicenseStatusValue;
    status_label: string;
    status_reason: string | null;
    status_changed_at: string | null;
    sign_kind: string | null;
    sign_faces: number | null;
    sign_material: string | null;
    sign_width: string | null;
    sign_height: string | null;
    taxpayer_id: number;
    establishment_id: number;
    legacy_id: number | null;
    procedure: { id: number; code: string } | null;
    duplicates: number;
    replaced_by: { id: number; number: string } | null;
    verification_url: string;
    qr: string;
    is_legacy: boolean;
    needs_confirmation: boolean;
    confirmed_at: string | null;
    confirmation_note: string | null;
    confirmed_by: string | null;
    transitions: { value: LicenseStatusValue; label: string }[];
};

type Props = { license: LicenseDetail };

export default function LicenseShow({ license }: Props) {
    return (
        <>
            <Head title={license.number} />

            <div className="flex flex-col gap-5 p-4 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-2.5">
                        <Link
                            href={index()}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline"
                        >
                            <ArrowLeft className="size-4" />
                            Volver a licencias
                        </Link>
                        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            {license.type_label}
                            {license.series && (
                                <>
                                    {' · Serie '}
                                    <span className="font-mono">
                                        {license.series}
                                    </span>
                                </>
                            )}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-4xl leading-none font-bold">
                                N° {license.number}
                            </h1>
                            <LicenseStatusBadge
                                status={license.status}
                                label={license.status_label}
                            />
                            {license.needs_confirmation && (
                                <LicensePendingBadge />
                            )}
                        </div>
                        <p>
                            {license.holder_name}
                            <span className="text-muted-foreground">
                                {' · '}
                                <span className="font-mono">
                                    {license.holder_document}
                                </span>
                            </span>
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {license.type === 'licencia' && (
                            <Button variant="outline" asChild>
                                <a
                                    href={LicenseController.print.url(
                                        license.id,
                                        { query: { blank: 1 } },
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Printer />
                                    Hoja blanca
                                </a>
                            </Button>
                        )}
                        <Button asChild>
                            <a
                                href={LicenseController.print.url(license.id)}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <Printer />
                                {license.type === 'licencia'
                                    ? 'Imprimir en hoja membretada'
                                    : 'Imprimir'}
                            </a>
                        </Button>
                    </div>
                </div>

                {license.needs_confirmation && (
                    <section
                        aria-label="Confirmación pendiente"
                        className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#f1d9a6] bg-[#fff6e3] px-5 py-4 dark:border-amber-400/30 dark:bg-amber-400/10"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fbe7b8] text-[#85520a] dark:bg-amber-400/20 dark:text-amber-300">
                            <History className="size-5" />
                        </span>
                        <div className="min-w-60 flex-1 space-y-1">
                            <p className="font-semibold text-[#5c3a06] dark:text-amber-200">
                                Importada del sistema anterior: falta confirmar
                                su vigencia
                            </p>
                            <p className="text-sm text-[#6e4a10] dark:text-amber-200/80">
                                En el sistema anterior casi nunca se registraban
                                los cierres. Su QR advierte que puede no estar
                                actualizada hasta que la municipalidad confirme
                                si el local sigue funcionando. Si cerró, usa{' '}
                                <strong>Cambiar situación</strong>.
                            </p>
                        </div>
                        <ConfirmLicense license={license} />
                    </section>
                )}

                {license.status !== 'vigente' && license.status_reason && (
                    <section
                        aria-label="Situación actual"
                        className="rounded-2xl border bg-card px-5 py-4"
                    >
                        <p className="font-semibold">
                            {license.status_label}
                            {license.status_changed_at &&
                                ` desde el ${formatDate(license.status_changed_at)}`}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {license.status_reason}
                        </p>
                        {license.replaced_by && (
                            <Link
                                href={show(license.replaced_by.id)}
                                className="mt-2 inline-block text-sm font-semibold text-link underline underline-offset-4"
                            >
                                Ver la licencia que la reemplaza:{' '}
                                {license.replaced_by.number}
                            </Link>
                        )}
                    </section>
                )}

                <div className="flex flex-wrap items-start gap-5">
                    <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
                        <Card title="Establecimiento">
                            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                {license.trade_name && (
                                    <Field label="Nombre comercial" wide>
                                        {license.trade_name}
                                    </Field>
                                )}
                                <Field label="Giro" wide>
                                    <span className="font-semibold">
                                        {license.activity}
                                    </span>
                                </Field>
                                <Field label="Dirección" wide>
                                    {license.address}
                                </Field>
                                <Field label="Área">
                                    {license.area && (
                                        <span className="font-mono">
                                            {Number(
                                                license.area,
                                            ).toLocaleString('es-PE')}{' '}
                                            m²
                                        </span>
                                    )}
                                </Field>
                                <Field label="Aforo">
                                    {license.capacity !== null && (
                                        <span className="font-mono">
                                            {license.capacity} personas
                                        </span>
                                    )}
                                </Field>
                                <Field label="Nivel de riesgo">
                                    {license.risk_level && (
                                        <span className="inline-flex rounded-md bg-accent px-2 py-0.5 text-xs font-semibold capitalize">
                                            {license.risk_level}
                                        </span>
                                    )}
                                </Field>
                                {license.sign_kind && (
                                    <Field label="Anuncio" wide>
                                        {`${license.sign_kind}, ${license.sign_faces} cara(s), ${license.sign_width} × ${license.sign_height} m${license.sign_material ? ` · ${license.sign_material}` : ''}`}
                                    </Field>
                                )}
                            </dl>
                        </Card>

                        <Card title="Titular">
                            <div className="flex flex-wrap items-center gap-4">
                                <span
                                    aria-hidden="true"
                                    className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent font-bold text-[#6b4e0f] dark:text-gold"
                                >
                                    {initials(license.holder_name)}
                                </span>
                                <div className="min-w-48 flex-1">
                                    <p className="font-semibold">
                                        {license.holder_name}
                                    </p>
                                    <p className="font-mono text-sm text-muted-foreground">
                                        {license.holder_document}
                                    </p>
                                </div>
                                <Button variant="outline" asChild>
                                    <Link
                                        href={showTaxpayer(license.taxpayer_id)}
                                    >
                                        Ver contribuyente
                                    </Link>
                                </Button>
                            </div>
                        </Card>

                        <Card title="Historial">
                            <Timeline license={license} />
                        </Card>
                    </div>

                    <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
                        <VerificationCard license={license} />

                        <Card title="Vigencia">
                            <dl className="space-y-3 text-sm">
                                <Row label="Emitida">
                                    {formatDate(license.issued_at)}
                                </Row>
                                <Row label="Vence">
                                    {license.valid_until
                                        ? formatDate(license.valid_until)
                                        : 'Indeterminada'}
                                </Row>
                                {(license.series || license.procedure) && (
                                    <Row label="Serie del formato">
                                        <span className="inline-flex items-center gap-1">
                                            <span className="font-mono">
                                                {license.series ?? '—'}
                                            </span>
                                            {license.procedure && (
                                                <EditLicenseSeries
                                                    license={license}
                                                />
                                            )}
                                        </span>
                                    </Row>
                                )}
                                <Row label="Origen">
                                    {license.procedure ? (
                                        <Link
                                            href={showProcedure(
                                                license.procedure.id,
                                            )}
                                            className="text-link hover:underline"
                                        >
                                            Trámite {license.procedure.code}
                                        </Link>
                                    ) : license.legacy_id ? (
                                        `Sistema anterior (${license.legacy_id})`
                                    ) : (
                                        '—'
                                    )}
                                </Row>
                                {license.duplicates > 0 && (
                                    <Row label="Duplicados">
                                        {license.duplicates}
                                    </Row>
                                )}
                            </dl>
                        </Card>

                        <Card title="Cambiar situación">
                            <div className="flex flex-col gap-2">
                                {license.transitions.map((transition) => (
                                    <ChangeStatus
                                        key={transition.value}
                                        license={license}
                                        transition={transition}
                                    />
                                ))}
                                <Link
                                    href={createProcedure({
                                        query: {
                                            taxpayer: license.taxpayer_id,
                                            establishment:
                                                license.establishment_id,
                                        },
                                    })}
                                    className="flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:bg-accent"
                                >
                                    <FilePlus2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            Nuevo trámite con estos datos
                                        </span>
                                        <span className="block text-sm text-muted-foreground">
                                            Duplicado, cambio de giro o
                                            renovación.
                                        </span>
                                    </span>
                                </Link>
                            </div>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('');
}

function Card({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 md:p-6">
            <h2 className="text-lg font-bold">{title}</h2>
            {children}
        </section>
    );
}

function Field({
    label,
    wide = false,
    children,
}: {
    label: string;
    wide?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={cn('space-y-1', wide && 'sm:col-span-2')}>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd>{children || '—'}</dd>
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-semibold">{children}</dd>
        </div>
    );
}

/**
 * The printed QR and the public page it opens, so staff can check what a
 * citizen sees when scanning it.
 */
function VerificationCard({ license }: { license: LicenseDetail }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        void navigator.clipboard
            .writeText(license.verification_url)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
    };

    return (
        <section className="flex flex-col items-center gap-4 rounded-2xl bg-sidebar p-5 text-center text-sidebar-foreground md:p-6">
            <h2 className="self-stretch text-left text-lg font-bold text-white">
                Verificación pública
            </h2>
            <div className="rounded-xl bg-white p-3">
                <img
                    src={license.qr}
                    alt={`Código QR de verificación de la licencia ${license.number}`}
                    className="size-40"
                />
            </div>
            <p className="text-sm">
                Cualquier ciudadano puede escanearlo y comprobar que la licencia
                es auténtica y su estado actual. Si cambias el estado, la
                verificación lo refleja al instante.
            </p>
            <div className="flex w-full flex-col gap-2">
                <Button
                    asChild
                    className="bg-gold font-bold text-[#1a1d21] hover:bg-gold/90"
                >
                    <a
                        href={license.verification_url}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <ExternalLink />
                        Abrir verificación
                    </a>
                </Button>
                <Button
                    variant="outline"
                    onClick={copy}
                    className="border-sidebar-border bg-transparent text-white hover:bg-sidebar-accent hover:text-white"
                >
                    {copied ? <Check /> : <Copy />}
                    {copied ? 'Enlace copiado' : 'Copiar enlace'}
                </Button>
            </div>
        </section>
    );
}

type HistoryEvent = {
    key: string;
    title: string;
    date: string | null;
    detail: ReactNode;
    dot: string;
};

/**
 * Built only from what the licence records: issue, confirmation and its
 * latest status change, newest first.
 */
function Timeline({ license }: { license: LicenseDetail }) {
    const events: HistoryEvent[] = [
        {
            key: 'issued',
            title: 'Licencia emitida',
            date: license.issued_at,
            dot: 'bg-[#12a06f]',
            detail: license.procedure ? (
                <Link
                    href={showProcedure(license.procedure.id)}
                    className="text-link hover:underline"
                >
                    Trámite {license.procedure.code}
                </Link>
            ) : license.legacy_id ? (
                `Registrada en el sistema anterior (licencia ${license.legacy_id})`
            ) : null,
        },
    ];

    if (license.confirmed_at) {
        events.push({
            key: 'confirmed',
            title: 'Vigencia confirmada',
            date: license.confirmed_at,
            dot: 'bg-[#12a06f]',
            detail: [
                license.confirmed_by && `Por ${license.confirmed_by}`,
                license.confirmation_note,
            ]
                .filter(Boolean)
                .join(' · '),
        });
    }

    if (license.status_changed_at) {
        events.push({
            key: 'status',
            title:
                license.status === 'vigente'
                    ? 'Reactivada'
                    : license.status_label,
            date: license.status_changed_at,
            dot: 'bg-gold-strong',
            detail: license.status_reason,
        });
    }

    events.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    if (license.needs_confirmation) {
        events.unshift({
            key: 'pending',
            title: 'Pendiente de confirmación',
            date: null,
            dot: 'border-2 border-dashed border-[#c9851a] bg-[#fffaf0]',
            detail: 'Falta verificar que el establecimiento siga funcionando.',
        });
    }

    return (
        <ol className="flex flex-col">
            {events.map((event, position) => (
                <li
                    key={event.key}
                    className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3"
                >
                    <div className="flex flex-col items-center">
                        <span
                            className={cn(
                                'mt-1 size-3 shrink-0 rounded-full',
                                event.dot,
                            )}
                        />
                        {position < events.length - 1 && (
                            <span className="min-h-7 w-0.5 flex-1 bg-border" />
                        )}
                    </div>
                    <div
                        className={cn(
                            'space-y-0.5',
                            position < events.length - 1 && 'pb-5',
                        )}
                    >
                        <p className="text-sm font-semibold">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                            {[event.date && formatDate(event.date)]
                                .filter(Boolean)
                                .join('')}
                            {event.date && event.detail ? ' · ' : ''}
                            {event.detail}
                        </p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

/**
 * Confirms an imported licence is still in force, with its basis.
 */
function ConfirmLicense({ license }: { license: LicenseDetail }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gold font-bold text-[#1a1d21] hover:bg-gold/90">
                    <BadgeCheck />
                    Confirmar vigencia
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    Confirmar vigencia de {license.number}
                </DialogTitle>
                <DialogDescription>
                    Confirma que el establecimiento sigue funcionando. Desde
                    ahora su QR mostrará la licencia como vigente sin
                    advertencias.
                </DialogDescription>
                <Form
                    noValidate
                    {...LicenseController.confirm.form(license.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="confirmation_note">
                                    Sustento
                                </Label>
                                <textarea
                                    id="confirmation_note"
                                    name="confirmation_note"
                                    rows={3}
                                    maxLength={255}
                                    placeholder="Inspección de fiscalización del 28/10/2026: local en funcionamiento."
                                    aria-invalid={
                                        errors.confirmation_note
                                            ? true
                                            : undefined
                                    }
                                    className={textareaClass}
                                />
                                <InputError
                                    message={errors.confirmation_note}
                                />
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Confirmar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * One allowed status change (closure, reopening, revocation), with reason.
 */
function ChangeStatus({
    license,
    transition,
}: {
    license: LicenseDetail;
    transition: { value: LicenseStatusValue; label: string };
}) {
    const [open, setOpen] = useState(false);
    const revokes = transition.value === 'anulada';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors',
                        revokes
                            ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                            : 'hover:bg-accent',
                    )}
                >
                    <span
                        className={cn(
                            'text-sm font-semibold',
                            revokes && 'text-destructive',
                        )}
                    >
                        {transition.value === 'vigente'
                            ? 'Reactivar'
                            : transition.label}
                    </span>
                    {TRANSITION_HINTS[transition.value] && (
                        <span className="text-sm text-muted-foreground">
                            {TRANSITION_HINTS[transition.value]}
                        </span>
                    )}
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    {transition.value === 'vigente'
                        ? 'Reactivar'
                        : transition.label}
                    : {license.number}
                </DialogTitle>
                <DialogDescription>
                    El cambio queda en el historial y la verificación por QR lo
                    muestra al instante.
                </DialogDescription>
                <Form
                    noValidate
                    {...LicenseController.changeStatus.form(license.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <input
                                type="hidden"
                                name="status"
                                value={transition.value}
                            />
                            <div className="grid gap-2">
                                <Label htmlFor={`reason-${transition.value}`}>
                                    Motivo
                                </Label>
                                <textarea
                                    id={`reason-${transition.value}`}
                                    name="reason"
                                    rows={3}
                                    aria-invalid={
                                        errors.reason ? true : undefined
                                    }
                                    className={textareaClass}
                                />
                                <InputError
                                    message={errors.reason ?? errors.status}
                                />
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button
                                    disabled={processing}
                                    variant={
                                        revokes ? 'destructive' : 'default'
                                    }
                                >
                                    {processing && <Spinner />}
                                    Guardar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

LicenseShow.layout = ({ license }: Props) => ({
    breadcrumbs: [
        { title: 'Licencias', href: index() },
        { title: license.number, href: show(license.id) },
    ],
});
