import { Form, Head, Link } from '@inertiajs/react';
import {
    Ban,
    Check,
    FileCheck,
    Pencil,
    Printer,
    Receipt,
    Store,
} from 'lucide-react';
import type { ReactNode } from 'react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import FormSelect from '@/components/form-select';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import ProcedureStatusBadge from '@/components/procedure-status-badge';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { show as showLicense } from '@/routes/licenses';
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

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

/** Dates come as YYYY-MM-DD; parse at noon so the time zone never shifts the day. */
const formatDate = (value: string) =>
    date.format(new Date(`${value.slice(0, 10)}T12:00:00`));

const STEPS: { status: ProcedureStatusValue; label: string }[] = [
    { status: 'registrado', label: 'Registrado' },
    { status: 'liquidado', label: 'Orden de pago' },
    { status: 'pagado', label: 'Pagado' },
    { status: 'emitido', label: 'Emitido' },
];

const EVENT_LABELS: Record<string, string> = {
    registrado: 'Trámite registrado',
    actualizado: 'Datos actualizados',
    liquidado: 'Orden de pago emitida',
    pagado: 'Pago registrado',
    emitido: 'Documentos emitidos',
    anulado: 'Trámite anulado',
    licencia_vigente: 'Licencia reactivada',
    licencia_cese_temporal: 'Cese temporal',
    licencia_cese_definitivo: 'Cese definitivo',
    licencia_anulada: 'Licencia anulada',
};

const textareaClassName =
    'flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm';

const formatFee = (fee: string | null) =>
    fee === null
        ? '—'
        : Number(fee) === 0
          ? 'Gratuito'
          : currency.format(Number(fee));

type Props = { procedure: ProcedureDetail; currentUit: CurrentUit };

/**
 * The procedure's file: where every step of the procedure happens, instead
 * of one window per action as in the old system.
 */
export default function ProcedureShow({ procedure, currentUit }: Props) {
    const order = procedure.payment_order;
    const referentialTotal = procedure.types.reduce(
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
                    <>
                        <Stepper status={procedure.status} />
                        <NextStep
                            procedure={procedure}
                            referentialTotal={referentialTotal}
                            currentUit={currentUit}
                        />
                    </>
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

                {order ? (
                    <Card
                        title={`Orden de pago ${order.code}`}
                        action={
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={ProcedureController.printPaymentOrder.url(
                                        procedure.id,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Printer />
                                    Imprimir
                                </a>
                            </Button>
                        }
                    >
                        <div className="mb-2">
                            <Badge
                                variant="outline"
                                className={cn(
                                    order.status === 'pagada' &&
                                        'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
                                    order.status === 'pendiente' &&
                                        'border-amber-500/40 text-amber-700 dark:text-amber-300',
                                    order.status === 'anulada' &&
                                        'border-red-500/40 text-red-700 dark:text-red-300',
                                )}
                            >
                                {order.status_label}
                            </Badge>
                        </div>
                        <ul className="divide-y">
                            {order.items.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-start justify-between gap-4 py-2 text-sm"
                                >
                                    <span>{item.description}</span>
                                    <span className="whitespace-nowrap tabular-nums">
                                        {formatFee(item.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between border-t pt-3 text-sm">
                            <span className="text-muted-foreground">
                                UIT {order.uit_year}:{' '}
                                {currency.format(Number(order.uit_amount))}
                                {order.receipt_number &&
                                    ` · Comprobante ${order.receipt_number}${order.paid_at ? ` del ${formatDate(order.paid_at)}` : ''}`}
                            </span>
                            <span className="font-semibold tabular-nums">
                                Total {currency.format(Number(order.total))}
                            </span>
                        </div>
                    </Card>
                ) : (
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
                                        {formatFee(type.fee)}
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
                                Total {currency.format(referentialTotal)}
                            </span>
                        </div>
                    </Card>
                )}

                {procedure.licenses.length > 0 && (
                    <Card title="Documentos emitidos">
                        <ul className="divide-y">
                            {procedure.licenses.map((license) => (
                                <li key={license.id}>
                                    <Link
                                        href={showLicense(license.id)}
                                        className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                                    >
                                        <span className="flex items-center gap-2">
                                            <FileCheck className="size-4 text-muted-foreground" />
                                            {license.type_label}{' '}
                                            <span className="font-medium tabular-nums">
                                                {license.number}
                                            </span>
                                        </span>
                                        <Badge variant="outline">
                                            {license.status_label}
                                        </Badge>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}

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

/**
 * The one action that moves the procedure forward from its current status.
 */
function NextStep({
    procedure,
    referentialTotal,
    currentUit,
}: {
    procedure: ProcedureDetail;
    referentialTotal: number;
    currentUit: CurrentUit;
}) {
    if (procedure.status === 'emitido') {
        return null;
    }

    return (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            {procedure.status === 'registrado' && (
                <>
                    <div className="text-sm">
                        <div className="font-medium">
                            Siguiente paso: emitir la orden de pago
                        </div>
                        <div className="text-muted-foreground">
                            {currentUit
                                ? `Congela los montos con la UIT ${currentUit.year}: ${currency.format(referentialTotal)}.`
                                : `Falta registrar la UIT ${new Date().getFullYear()}.`}
                        </div>
                    </div>
                    <ConfirmAction
                        trigger={
                            <Button disabled={!currentUit}>
                                <Receipt />
                                Emitir orden de pago
                            </Button>
                        }
                        title="¿Emitir la orden de pago?"
                        description={`Por ${currency.format(referentialTotal)}. Después ya no se podrá editar el trámite.${referentialTotal === 0 ? ' Al ser S/ 0.00 quedará pagado (exonerado).' : ''}`}
                        form={ProcedureController.issuePaymentOrder.form(
                            procedure.id,
                        )}
                        submitLabel="Emitir orden"
                    />
                </>
            )}

            {procedure.status === 'liquidado' && procedure.payment_order && (
                <>
                    <div className="text-sm">
                        <div className="font-medium">
                            Siguiente paso: registrar el pago en Caja
                        </div>
                        <div className="text-muted-foreground">
                            Orden {procedure.payment_order.code} por{' '}
                            {currency.format(
                                Number(procedure.payment_order.total),
                            )}
                            .
                        </div>
                    </div>
                    <RegisterPaymentDialog procedure={procedure} />
                </>
            )}

            {procedure.status === 'pagado' && (
                <>
                    <div className="text-sm">
                        <div className="font-medium">
                            Siguiente paso:{' '}
                            {procedure.documents_to_issue.length > 0
                                ? `emitir ${procedure.documents_to_issue.join(' y ').toLowerCase()}`
                                : 'dar por atendido el trámite'}
                        </div>
                        <div className="text-muted-foreground">
                            {procedure.documents_to_issue.length > 0
                                ? 'Cada documento lleva un QR para verificar su vigencia.'
                                : 'Estos procedimientos no emiten documento.'}
                        </div>
                    </div>
                    <IssueDocumentsDialog procedure={procedure} />
                </>
            )}
        </section>
    );
}

function ConfirmAction({
    trigger,
    title,
    description,
    form,
    submitLabel,
}: {
    trigger: ReactNode;
    title: string;
    description: string;
    form: { action: string; method: 'post' };
    submitLabel: string;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
                <Form noValidate {...form} options={{ preserveScroll: true }}>
                    {({ processing, errors }) => (
                        <>
                            <InputError
                                message={Object.values(errors)[0]}
                                className="mb-4"
                            />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    {submitLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function RegisterPaymentDialog({ procedure }: { procedure: ProcedureDetail }) {
    const today = new Date().toLocaleDateString('en-CA');

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <Receipt />
                    Registrar pago
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Registrar pago</DialogTitle>
                <DialogDescription>
                    Comprobante emitido por Caja para la orden{' '}
                    {procedure.payment_order?.code}.
                </DialogDescription>
                <Form
                    noValidate
                    {...ProcedureController.registerPayment.form(procedure.id)}
                    options={{ preserveScroll: true }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="receipt_number">
                                        N° de comprobante
                                    </Label>
                                    <Input
                                        id="receipt_number"
                                        name="receipt_number"
                                        aria-invalid={
                                            errors.receipt_number
                                                ? true
                                                : undefined
                                        }
                                        autoFocus
                                    />
                                    <InputError
                                        message={errors.receipt_number}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="paid_at">
                                        Fecha de pago
                                    </Label>
                                    <Input
                                        id="paid_at"
                                        type="date"
                                        name="paid_at"
                                        defaultValue={today}
                                        max={today}
                                        aria-invalid={
                                            errors.paid_at ? true : undefined
                                        }
                                    />
                                    <InputError message={errors.paid_at} />
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Registrar pago
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function IssueDocumentsDialog({ procedure }: { procedure: ProcedureDetail }) {
    const issuesNothing = procedure.documents_to_issue.length === 0;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <FileCheck />
                    {issuesNothing ? 'Dar por atendido' : 'Emitir documentos'}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogTitle>
                    {issuesNothing
                        ? '¿Dar por atendido el trámite?'
                        : 'Emitir documentos'}
                </DialogTitle>
                <DialogDescription>
                    {issuesNothing
                        ? 'El trámite quedará como emitido, sin documento.'
                        : `Se emitirá: ${procedure.documents_to_issue.join(', ')}. Los datos del titular y del establecimiento quedan fijados tal como están hoy.`}
                </DialogDescription>
                <Form
                    noValidate
                    {...ProcedureController.issueDocuments.form(procedure.id)}
                    options={{ preserveScroll: true }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            {procedure.needs_sign_data && (
                                <fieldset className="space-y-3">
                                    <legend className="mb-2 text-sm font-semibold">
                                        Datos del anuncio
                                    </legend>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="sign_kind">
                                                Tipo
                                            </Label>
                                            <FormSelect
                                                id="sign_kind"
                                                name="sign_kind"
                                                options={[
                                                    {
                                                        value: 'simple',
                                                        label: 'Simple (adosado)',
                                                    },
                                                    {
                                                        value: 'luminoso',
                                                        label: 'Luminoso',
                                                    },
                                                    {
                                                        value: 'iluminado',
                                                        label: 'Iluminado',
                                                    },
                                                ]}
                                                invalid={!!errors.sign_kind}
                                            />
                                            <InputError
                                                message={errors.sign_kind}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sign_faces">
                                                Caras
                                            </Label>
                                            <Input
                                                id="sign_faces"
                                                type="number"
                                                name="sign_faces"
                                                defaultValue={1}
                                                min={1}
                                                max={4}
                                                aria-invalid={
                                                    errors.sign_faces
                                                        ? true
                                                        : undefined
                                                }
                                            />
                                            <InputError
                                                message={errors.sign_faces}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sign_width">
                                                Largo (m)
                                            </Label>
                                            <Input
                                                id="sign_width"
                                                type="number"
                                                step="0.01"
                                                name="sign_width"
                                                aria-invalid={
                                                    errors.sign_width
                                                        ? true
                                                        : undefined
                                                }
                                            />
                                            <InputError
                                                message={errors.sign_width}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="sign_height">
                                                Alto (m)
                                            </Label>
                                            <Input
                                                id="sign_height"
                                                type="number"
                                                step="0.01"
                                                name="sign_height"
                                                aria-invalid={
                                                    errors.sign_height
                                                        ? true
                                                        : undefined
                                                }
                                            />
                                            <InputError
                                                message={errors.sign_height}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="sign_material">
                                            Material (opcional)
                                        </Label>
                                        <Input
                                            id="sign_material"
                                            name="sign_material"
                                            placeholder="Acrílico, lona, metal…"
                                        />
                                        <InputError
                                            message={errors.sign_material}
                                        />
                                    </div>
                                </fieldset>
                            )}

                            {!issuesNothing && (
                                <div className="grid gap-2">
                                    <Label htmlFor="valid_until">
                                        Vigencia temporal hasta (opcional)
                                    </Label>
                                    <Input
                                        id="valid_until"
                                        type="date"
                                        name="valid_until"
                                        min={new Date(
                                            Date.now() + 86400000,
                                        ).toLocaleDateString('en-CA')}
                                        aria-invalid={
                                            errors.valid_until
                                                ? true
                                                : undefined
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Solo si el solicitante pidió una
                                        licencia temporal. Vacío = según el tipo
                                        de trámite (por ley, indeterminada salvo
                                        excepciones como la provisional de
                                        bodegas).
                                    </p>
                                    <InputError message={errors.valid_until} />
                                </div>
                            )}

                            <InputError message={errors.documents} />

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    {issuesNothing ? 'Confirmar' : 'Emitir'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function Stepper({ status }: { status: ProcedureStatusValue }) {
    const current = STEPS.findIndex((step) => step.status === status);

    return (
        <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((step, index) => {
                const done = index < current || status === 'emitido';
                const active = index === current && status !== 'emitido';

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

function Card({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-sidebar-border/70 p-5 dark:border-sidebar-border">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                    {title}
                </h2>
                {action}
            </div>
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
                    {procedure.payment_order?.status === 'pendiente' &&
                        ` Su orden ${procedure.payment_order.code} también se anulará.`}
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
                                    className={textareaClassName}
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
