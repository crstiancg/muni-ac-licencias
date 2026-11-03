import { Form, Head, Link } from '@inertiajs/react';
import {
    BadgeCheck,
    CircleAlert,
    Copy,
    ExternalLink,
    Printer,
    RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import FormSelect from '@/components/form-select';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import LicenseStatusBadge from '@/components/license-status-badge';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
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

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <div className="space-y-2">
                        <Heading
                            title={`${license.type_label} ${license.number}`}
                            description={`Emitida el ${formatDate(license.issued_at)}`}
                        />
                        <LicenseStatusBadge
                            status={license.status}
                            label={license.status_label}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                                    Imprimir en hoja blanca
                                </a>
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <a
                                href={license.verification_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink />
                                Ver verificación pública
                            </a>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link
                                href={createProcedure({
                                    query: {
                                        taxpayer: license.taxpayer_id,
                                        establishment: license.establishment_id,
                                    },
                                })}
                            >
                                <Copy />
                                Nuevo trámite con estos datos
                            </Link>
                        </Button>
                        {license.transitions.length > 0 && (
                            <ChangeStatus license={license} />
                        )}
                    </div>
                </div>

                {license.needs_confirmation && (
                    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
                        <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="font-medium">
                                Vigencia sin confirmar
                            </div>
                            <p className="text-muted-foreground">
                                Licencia del sistema anterior, donde casi nunca
                                se registraban los cierres. Su QR advierte que
                                puede no estar actualizada hasta que la
                                municipalidad confirme si el local sigue
                                funcionando. Si cerró, usa{' '}
                                <strong>Cambiar estado</strong>.
                            </p>
                        </div>
                        <ConfirmLicense license={license} />
                    </div>
                )}

                {license.confirmed_at && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
                        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                        <div>
                            <div className="font-medium">
                                Vigencia confirmada el{' '}
                                {formatDate(license.confirmed_at)}
                                {license.confirmed_by &&
                                    ` por ${license.confirmed_by}`}
                            </div>
                            {license.confirmation_note && (
                                <div className="text-muted-foreground">
                                    {license.confirmation_note}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {license.status !== 'vigente' && license.status_reason && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
                        <div className="font-medium">
                            {license.status_label}
                            {license.status_changed_at &&
                                ` desde el ${formatDate(license.status_changed_at)}`}
                        </div>
                        <div className="mt-1">{license.status_reason}</div>
                        {license.replaced_by && (
                            <Link
                                href={show(license.replaced_by.id)}
                                className="mt-1 inline-block font-medium underline underline-offset-4"
                            >
                                Ver {license.replaced_by.number}
                            </Link>
                        )}
                    </div>
                )}

                <section className="grid gap-x-8 gap-y-4 rounded-xl border border-sidebar-border/70 p-6 sm:grid-cols-2 dark:border-sidebar-border">
                    <Field label="Titular">
                        <Link
                            href={showTaxpayer(license.taxpayer_id)}
                            className={buttonVariants({
                                variant: 'outline',
                                size: 'sm',
                            })}
                        >
                            {license.holder_name}
                        </Link>{' '}
                        <span className="text-muted-foreground">
                            ({license.holder_document})
                        </span>
                    </Field>
                    <Field label="Nombre comercial">{license.trade_name}</Field>
                    <Field label="Giro">{license.activity}</Field>
                    <Field label="Dirección">{license.address}</Field>
                    <Field label="Área">
                        {license.area &&
                            `${Number(license.area).toLocaleString('es-PE')} m²`}
                    </Field>
                    <Field label="Vigencia">
                        {license.valid_until
                            ? `Hasta el ${formatDate(license.valid_until)}`
                            : 'Indeterminada'}
                    </Field>
                    {license.series && (
                        <Field label="Serie del formato">
                            {license.series}
                        </Field>
                    )}
                    {license.sign_kind && (
                        <Field label="Anuncio">
                            {`${license.sign_kind}, ${license.sign_faces} cara(s), ${license.sign_width} × ${license.sign_height} m${license.sign_material ? ` · ${license.sign_material}` : ''}`}
                        </Field>
                    )}
                    <Field label="Trámite">
                        {license.procedure ? (
                            <Link
                                href={showProcedure(license.procedure.id)}
                                className={buttonVariants({
                                    variant: 'outline',
                                    size: 'sm',
                                })}
                            >
                                {license.procedure.code}
                            </Link>
                        ) : license.legacy_id ? (
                            `Sistema anterior (licencia ${license.legacy_id})`
                        ) : null}
                    </Field>
                </section>

                <p className="text-sm text-muted-foreground">
                    El QR impreso apunta a{' '}
                    <span className="font-mono">
                        {license.verification_url}
                    </span>
                    . Si cambias el estado, la verificación pública lo refleja
                    al instante.
                </p>
            </div>
        </>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm">{children || '—'}</div>
        </div>
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
                <Button size="sm">
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
                                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
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

function ChangeStatus({ license }: { license: LicenseDetail }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <RefreshCw />
                    Cambiar estado
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Cambiar estado de {license.number}</DialogTitle>
                <DialogDescription>
                    Cese temporal o definitivo, reactivación o anulación. El
                    cambio queda en el historial y en la verificación por QR.
                </DialogDescription>
                <Form
                    noValidate
                    {...LicenseController.changeStatus.form(license.id)}
                    options={{ preserveScroll: true }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Nuevo estado</Label>
                                <FormSelect
                                    id="status"
                                    name="status"
                                    options={license.transitions}
                                    invalid={!!errors.status}
                                />
                                <InputError message={errors.status} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="reason">Motivo</Label>
                                <textarea
                                    id="reason"
                                    name="reason"
                                    rows={3}
                                    aria-invalid={
                                        errors.reason ? true : undefined
                                    }
                                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
                                />
                                <InputError message={errors.reason} />
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

LicenseShow.layout = ({ license }: Props) => ({
    breadcrumbs: [
        { title: 'Licencias', href: index() },
        { title: license.number, href: show(license.id) },
    ],
});
