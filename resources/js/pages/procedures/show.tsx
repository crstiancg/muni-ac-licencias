import { Form, Head, Link } from '@inertiajs/react';
import { Ban, Check, Pencil, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import ProcedureStatusBadge from '@/components/procedure-status-badge';
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
import { edit, index, show } from '@/routes/procedures';
import { show as showTaxpayer } from '@/routes/taxpayers';
import type {
    CurrentUit,
    ProcedureDetail,
    ProcedureStatusValue,
} from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const dateTime = new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const STEPS: { status: ProcedureStatusValue; label: string }[] = [
    { status: 'registrado', label: 'Registrado' },
    { status: 'liquidado', label: 'Orden de pago' },
    { status: 'pagado', label: 'Pagado' },
    { status: 'emitido', label: 'Emitido' },
];

const EVENT_LABELS: Record<string, string> = {
    registrado: 'Trámite registrado',
    actualizado: 'Datos actualizados',
    anulado: 'Trámite anulado',
};

type Props = { procedure: ProcedureDetail; currentUit: CurrentUit };

/**
 * The procedure's file: where every step of the procedure happens, instead
 * of one window per action as in the old system.
 */
export default function ProcedureShow({ procedure, currentUit }: Props) {
    const total = procedure.types.reduce(
        (sum, type) => sum + Number(type.fee ?? 0),
        0,
    );

    return (
        <>
            <Head title={`Trámite ${procedure.code}`} />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Heading
                            title={`Trámite ${procedure.code}`}
                            description={`Registrado el ${dateTime.format(new Date(procedure.created_at))}${procedure.registered_by ? ` por ${procedure.registered_by.name}` : ''}`}
                        />
                        <ProcedureStatusBadge
                            status={procedure.status}
                            label={procedure.status_label}
                        />
                    </div>

                    <div className="flex gap-2">
                        {procedure.is_editable && (
                            <Button variant="outline" asChild>
                                <Link href={edit(procedure.id)}>
                                    <Pencil />
                                    Editar
                                </Link>
                            </Button>
                        )}
                        {procedure.is_cancellable && (
                            <CancelProcedure procedure={procedure} />
                        )}
                    </div>
                </div>

                {procedure.status === 'anulado' ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm">
                        <div className="font-medium text-red-700 dark:text-red-300">
                            Anulado
                            {procedure.cancelled_at &&
                                ` el ${dateTime.format(new Date(procedure.cancelled_at))}`}
                        </div>
                        <div className="mt-1">
                            {procedure.cancellation_reason}
                        </div>
                    </div>
                ) : (
                    <Stepper status={procedure.status} />
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card title="Contribuyente">
                        <Link
                            href={showTaxpayer(procedure.taxpayer.id)}
                            className="font-medium hover:underline"
                        >
                            {procedure.taxpayer.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                            {procedure.taxpayer.document_type.toUpperCase()}{' '}
                            {procedure.taxpayer.document_number}
                            {procedure.taxpayer.ruc &&
                                ` · RUC ${procedure.taxpayer.ruc}`}
                        </div>
                        {procedure.taxpayer.phone && (
                            <div className="text-sm text-muted-foreground">
                                Tel. {procedure.taxpayer.phone}
                            </div>
                        )}
                    </Card>

                    <Card title="Establecimiento">
                        <div className="flex gap-2">
                            <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div>
                                <div className="font-medium">
                                    {procedure.establishment.trade_name ??
                                        procedure.establishment.activity}
                                </div>
                                {procedure.establishment.trade_name && (
                                    <div className="text-sm">
                                        {procedure.establishment.activity}
                                    </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                    {procedure.establishment.full_address}
                                    {procedure.establishment.area &&
                                        ` · ${Number(procedure.establishment.area).toLocaleString('es-PE')} m²`}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <Card title="Procedimientos solicitados">
                    <ul className="divide-y">
                        {procedure.types.map((type) => (
                            <li
                                key={type.id}
                                className="flex items-start justify-between gap-4 py-2 text-sm"
                            >
                                <span>
                                    {type.tupa_code && (
                                        <span className="mr-1 text-muted-foreground">
                                            {type.tupa_code}
                                        </span>
                                    )}
                                    {type.name}
                                </span>
                                <span className="whitespace-nowrap tabular-nums">
                                    {type.fee === null
                                        ? '—'
                                        : Number(type.fee) === 0
                                          ? 'Gratuito'
                                          : currency.format(Number(type.fee))}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-2 flex items-center justify-between border-t pt-3 text-sm">
                        <span className="text-muted-foreground">
                            {currentUit
                                ? `Referencial con la UIT ${currentUit.year}.`
                                : 'Falta registrar la UIT del año.'}
                        </span>
                        <span className="font-semibold tabular-nums">
                            Total {currency.format(total)}
                        </span>
                    </div>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card title="Mesa de partes">
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                            <dt className="text-muted-foreground">
                                N° de expediente
                            </dt>
                            <dd>{procedure.file_number ?? '—'}</dd>
                            <dt className="text-muted-foreground">Folios</dt>
                            <dd>{procedure.folios ?? '—'}</dd>
                        </dl>
                        {procedure.notes && (
                            <p className="mt-3 text-sm whitespace-pre-line">
                                {procedure.notes}
                            </p>
                        )}
                    </Card>

                    <Card title="Historial">
                        <ol className="space-y-3">
                            {procedure.events.map((event) => (
                                <li key={event.id} className="text-sm">
                                    <div className="font-medium">
                                        {EVENT_LABELS[event.type] ?? event.type}
                                    </div>
                                    <div className="text-muted-foreground">
                                        {dateTime.format(
                                            new Date(event.created_at),
                                        )}
                                        {event.user && ` · ${event.user.name}`}
                                    </div>
                                    {event.description && (
                                        <div>{event.description}</div>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </Card>
                </div>
            </div>
        </>
    );
}

function Stepper({ status }: { status: ProcedureStatusValue }) {
    const current = STEPS.findIndex((step) => step.status === status);

    return (
        <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((step, index) => {
                const done = index < current;
                const active = index === current;

                return (
                    <li key={step.status} className="flex flex-col gap-2">
                        <div
                            className={cn(
                                'h-1.5 rounded-full bg-muted',
                                (done || active) && 'bg-primary',
                            )}
                        />
                        <div
                            className={cn(
                                'flex items-center gap-1 text-xs text-muted-foreground sm:text-sm',
                                active && 'font-medium text-foreground',
                            )}
                        >
                            {done && <Check className="size-3.5" />}
                            {step.label}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                {title}
            </h2>
            {children}
        </section>
    );
}

function CancelProcedure({ procedure }: { procedure: ProcedureDetail }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Ban className="text-red-600 dark:text-red-400" />
                    Anular
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>¿Anular el trámite {procedure.code}?</DialogTitle>
                <DialogDescription>
                    El trámite queda en el historial como anulado, con el motivo
                    que indiques.
                </DialogDescription>

                <Form
                    noValidate
                    {...ProcedureController.cancel.form(procedure.id)}
                    options={{ preserveScroll: true }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="cancellation_reason">
                                    Motivo
                                </Label>
                                <textarea
                                    id="cancellation_reason"
                                    name="cancellation_reason"
                                    rows={3}
                                    aria-invalid={
                                        errors.cancellation_reason
                                            ? true
                                            : undefined
                                    }
                                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
                                />
                                <InputError
                                    message={errors.cancellation_reason}
                                />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Volver
                                    </Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Anular trámite
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

ProcedureShow.layout = ({ procedure }: Props) => ({
    breadcrumbs: [
        { title: 'Trámites', href: index() },
        { title: procedure.code, href: show(procedure.id) },
    ],
});
