import { Form, Head, Link } from '@inertiajs/react';
import {
    Ban,
    CalendarCheck,
    Check,
    ExternalLink,
    FileCheck,
    FileSignature,
    Inbox,
    Pencil,
    Printer,
    Receipt,
    Store,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import EditLicenseSeries from '@/components/edit-license-series';
import FormSelect from '@/components/form-select';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import LicensePicker from '@/components/license-picker';
import ProcedureStatusBadge from '@/components/procedure-status-badge';
import RegisterPaymentDialog from '@/components/register-payment-dialog';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
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
import LicenseStatusBadge from '@/components/license-status-badge';
import { print as printLicense, show as showLicense } from '@/routes/licenses';
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
    recepcionado: 'Recibido en mesa de partes',
    actualizado: 'Datos actualizados',
    liquidado: 'Orden de pago emitida',
    pagado: 'Pago registrado',
    emitido: 'Documentos emitidos',
    anulado: 'Trámite anulado',
    licencia_vigente: 'Licencia reactivada',
    licencia_cese_temporal: 'Cese temporal',
    licencia_cese_definitivo: 'Cese definitivo',
    licencia_anulada: 'Licencia anulada',
    licencia_reemplazada: 'Licencia reemplazada',
    licencia_caducada: 'Licencia caducada',
    licencia_duplicado: 'Duplicado de licencia',
    licencia_confirmada: 'Vigencia de licencia confirmada',
    licencia_serie: 'Serie del formato corregida',
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

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
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

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <a
                                href={ProcedureController.printDeclaration.url(
                                    procedure.id,
                                )}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <FileSignature />
                                Declaración jurada
                            </a>
                        </Button>
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
                            className={buttonVariants({
                                variant: 'outline',
                                size: 'sm',
                            })}
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

                {procedure.related_license && (
                    <Card title="Licencia afectada">
                        <Link
                            href={showLicense(procedure.related_license.id)}
                            className="flex items-center justify-between gap-3 text-sm hover:underline"
                        >
                            <span>
                                <span className="font-medium tabular-nums">
                                    {procedure.related_license.number}
                                </span>{' '}
                                · {procedure.related_license.holder_name} ·{' '}
                                {procedure.related_license.address}
                            </span>
                            <Badge variant="outline">
                                {procedure.related_license.status_label}
                            </Badge>
                        </Link>
                    </Card>
                )}

                {procedure.licenses.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-muted-foreground">
                            Documentos emitidos
                        </h2>
                        <div className="grid gap-4 xl:grid-cols-2">
                            {procedure.licenses.map((license) => (
                                <IssuedDocumentCard
                                    key={license.id}
                                    license={license}
                                />
                            ))}
                        </div>
                    </section>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card
                        title="Mesa de partes"
                        action={
                            procedure.status !== 'anulado' && (
                                <ReceptionDialog procedure={procedure} />
                            )
                        }
                    >
                        {!procedure.file_number && (
                            <p className="mb-3 text-sm text-muted-foreground">
                                Pendiente: el solicitante debe presentar la
                                declaración jurada firmada.
                            </p>
                        )}
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
                    <RegisterPaymentDialog
                        form={ProcedureController.registerPayment.form(
                            procedure.id,
                        )}
                        orderCode={procedure.payment_order.code}
                    />
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
                            {procedure.license_effects.length > 0
                                ? `${procedure.license_effects.join(', ')}: al emitir se elige la licencia afectada.`
                                : procedure.documents_to_issue.length > 0
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
                        ? 'El trámite quedará como emitido, sin documento nuevo.'
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
                            {procedure.document_types_to_issue.map((type) => (
                                <div key={type.value} className="grid gap-2">
                                    <Label htmlFor={`series_${type.value}`}>
                                        Serie del formato · {type.label}
                                    </Label>
                                    <Input
                                        id={`series_${type.value}`}
                                        name={`series[${type.value}]`}
                                        required
                                        maxLength={30}
                                        placeholder="N° impreso en el formato"
                                        aria-invalid={
                                            errors[`series.${type.value}`]
                                                ? true
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        message={errors[`series.${type.value}`]}
                                    />
                                </div>
                            ))}

                            {procedure.license_effects.length > 0 && (
                                <fieldset className="space-y-2">
                                    <legend className="mb-1 text-sm font-semibold">
                                        Licencia afectada
                                    </legend>
                                    <p className="text-xs text-muted-foreground">
                                        {procedure.license_effects.join(', ')}.
                                    </p>
                                    <LicensePicker
                                        name="related_license_id"
                                        taxpayerId={procedure.taxpayer.id}
                                        error={errors.related_license_id}
                                    />
                                </fieldset>
                            )}

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

/**
 * The procedure's outcome: the issued licence or authorization with its
 * status, validity and verification QR, one click from printing it.
 */
function IssuedDocumentCard({
    license,
}: {
    license: ProcedureDetail['licenses'][number];
}) {
    const active = license.status === 'vigente';

    return (
        <article
            className={cn(
                'flex flex-col overflow-hidden rounded-xl border',
                active
                    ? 'border-emerald-500/40 bg-emerald-500/[0.03]'
                    : 'border-sidebar-border/70 dark:border-sidebar-border',
            )}
        >
            <div className="flex gap-4 p-5">
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {license.type_label}
                        </span>
                        <LicenseStatusBadge
                            status={license.status}
                            label={license.status_label}
                        />
                        {license.duplicates > 0 && (
                            <Badge variant="secondary">
                                Duplicado
                                {license.duplicates > 1 &&
                                    ` N° ${license.duplicates}`}
                            </Badge>
                        )}
                    </div>

                    <div className="text-2xl font-semibold tracking-tight tabular-nums">
                        {license.number}
                    </div>

                    <div className="space-y-0.5 text-sm">
                        <div className="font-medium">
                            {license.trade_name ?? license.activity}
                        </div>
                        {license.trade_name && (
                            <div className="text-muted-foreground">
                                {license.activity}
                            </div>
                        )}
                        <div className="text-muted-foreground">
                            {license.holder_name}
                        </div>
                    </div>

                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5">
                            <CalendarCheck className="size-4 text-muted-foreground" />
                            <dt className="text-muted-foreground">Emitida</dt>
                            <dd>{formatDate(license.issued_at)}</dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <dt className="text-muted-foreground">Vigencia</dt>
                            <dd>
                                {license.valid_until
                                    ? `hasta ${formatDate(license.valid_until)}`
                                    : 'Indeterminada'}
                            </dd>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <dt className="text-muted-foreground">Serie</dt>
                            <dd className="tabular-nums">
                                {license.series ?? '—'}
                            </dd>
                            <EditLicenseSeries license={license} />
                        </div>
                    </dl>
                </div>

                <a
                    href={license.verification_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Abrir la verificación pública"
                    className="hidden shrink-0 self-start rounded-lg border bg-white p-1.5 transition-shadow hover:shadow-md sm:block"
                >
                    <img
                        src={license.qr}
                        alt={`QR de verificación de ${license.number}`}
                        className="size-24"
                    />
                </a>
            </div>

            <div className="mt-auto flex flex-wrap gap-2 border-t bg-muted/30 px-5 py-3">
                <Button size="sm" asChild>
                    <a
                        href={printLicense.url(license.id)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Printer />
                        {license.type === 'licencia'
                            ? 'Imprimir en hoja membretada'
                            : 'Imprimir'}
                    </a>
                </Button>
                {license.type === 'licencia' && (
                    <Button size="sm" variant="outline" asChild>
                        <a
                            href={printLicense.url(license.id, {
                                query: { blank: 1 },
                            })}
                            target="_blank"
                            rel="noreferrer"
                        >
                            <Printer />
                            Imprimir en hoja blanca
                        </a>
                    </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                    <Link href={showLicense(license.id)}>
                        <FileCheck />
                        Ver licencia
                    </Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                    <a
                        href={license.verification_url}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <ExternalLink />
                        Verificar
                    </a>
                </Button>
            </div>
        </article>
    );
}

/**
 * Mesa de partes receives the signed sworn declaration: expediente,
 * folios and notes, recorded after the procedure was registered.
 */
function ReceptionDialog({ procedure }: { procedure: ProcedureDetail }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Inbox />
                    {procedure.file_number ? 'Editar' : 'Recibir DJ'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Recepción en mesa de partes</DialogTitle>
                <DialogDescription>
                    Registra el expediente cuando el solicitante presenta la
                    declaración jurada firmada del trámite {procedure.code}.
                </DialogDescription>

                <Form
                    {...ProcedureController.reception.form(procedure.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="file_number">
                                        N° de expediente
                                    </Label>
                                    <Input
                                        id="file_number"
                                        name="file_number"
                                        defaultValue={
                                            procedure.file_number ?? ''
                                        }
                                        required
                                        autoFocus
                                    />
                                    <InputError message={errors.file_number} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="folios">Folios</Label>
                                    <Input
                                        id="folios"
                                        name="folios"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        defaultValue={procedure.folios ?? ''}
                                    />
                                    <InputError message={errors.folios} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">Observaciones</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={4}
                                    defaultValue={procedure.notes ?? ''}
                                    className={textareaClassName}
                                />
                                <InputError message={errors.notes} />
                            </div>

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
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
