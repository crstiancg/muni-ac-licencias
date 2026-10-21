import { Form, Head, Link } from '@inertiajs/react';
import { Copy, ExternalLink, Printer, RefreshCw } from 'lucide-react';
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
                                Imprimir
                            </a>
                        </Button>
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
