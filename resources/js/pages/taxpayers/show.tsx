import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Store, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import EstablishmentController from '@/actions/App/Http/Controllers/EstablishmentController';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import Heading from '@/components/heading';
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
import { Spinner } from '@/components/ui/spinner';
import {
    create as createEstablishment,
    edit as editEstablishment,
} from '@/routes/establishments';
import { edit, index, show } from '@/routes/taxpayers';
import type { DocumentTypeOption, Establishment, Taxpayer } from '@/types';

type Props = {
    taxpayer: Taxpayer;
    establishments: Establishment[];
    documentTypes: DocumentTypeOption[];
};

/**
 * The taxpayer's file: one place for their data and establishments
 * (procedures and licences will join here).
 */
export default function TaxpayerShow({
    taxpayer,
    establishments,
    documentTypes,
}: Props) {
    const documentLabel = documentTypes.find(
        (type) => type.value === taxpayer.document_type,
    )?.label;
    const isCompany =
        taxpayer.document_type === 'ruc' &&
        taxpayer.document_number.startsWith('20');

    return (
        <>
            <Head title={taxpayer.name} />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Heading
                            title={taxpayer.name}
                            description={`${documentLabel} ${taxpayer.document_number}${taxpayer.ruc ? ` · RUC ${taxpayer.ruc}` : ''}`}
                        />
                        {isCompany && (
                            <Badge variant="outline" className="-mt-4">
                                Persona jurídica
                            </Badge>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={edit(taxpayer.id)}>
                                <Pencil />
                                Editar
                            </Link>
                        </Button>
                        <DeleteTaxpayer taxpayer={taxpayer} />
                    </div>
                </div>

                <section className="grid gap-x-8 gap-y-4 rounded-xl border border-sidebar-border/70 p-6 sm:grid-cols-2 lg:grid-cols-3 dark:border-sidebar-border">
                    <Field label="Domicilio fiscal">
                        {[
                            taxpayer.address,
                            taxpayer.district,
                            taxpayer.province,
                            taxpayer.department,
                        ]
                            .filter(Boolean)
                            .join(' · ') || null}
                    </Field>
                    <Field label="Teléfono">{taxpayer.phone}</Field>
                    <Field label="Correo">{taxpayer.email}</Field>
                    {isCompany && (
                        <>
                            <Field label="Representante legal">
                                {taxpayer.representative_name}
                                {taxpayer.representative_document &&
                                    ` (DNI ${taxpayer.representative_document})`}
                            </Field>
                            <Field label="Partida registral">
                                {taxpayer.representative_sunarp}
                            </Field>
                            <Field label="Teléfono del representante">
                                {taxpayer.representative_phone}
                            </Field>
                        </>
                    )}
                </section>

                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold">
                            Establecimientos ({establishments.length})
                        </h2>
                        <Button asChild>
                            <Link
                                href={createEstablishment({
                                    query: { taxpayer: taxpayer.id },
                                })}
                            >
                                <Plus />
                                Agregar establecimiento
                            </Link>
                        </Button>
                    </div>

                    {establishments.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                            Aún no tiene establecimientos registrados.
                        </div>
                    ) : (
                        <ul className="grid gap-3 md:grid-cols-2">
                            {establishments.map((establishment) => (
                                <li
                                    key={establishment.id}
                                    className="flex gap-3 rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                                >
                                    <Store className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium">
                                            {establishment.trade_name ??
                                                establishment.activity}
                                        </div>
                                        {establishment.trade_name && (
                                            <div className="text-sm">
                                                {establishment.activity}
                                            </div>
                                        )}
                                        <div className="text-sm text-muted-foreground">
                                            {establishment.full_address}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {establishment.area && (
                                                <Badge variant="outline">
                                                    {Number(
                                                        establishment.area,
                                                    ).toLocaleString(
                                                        'es-PE',
                                                    )}{' '}
                                                    m²
                                                </Badge>
                                            )}
                                            {establishment.capacity && (
                                                <Badge variant="outline">
                                                    Aforo{' '}
                                                    {establishment.capacity}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            asChild
                                        >
                                            <Link
                                                href={editEstablishment(
                                                    establishment.id,
                                                )}
                                                aria-label="Editar establecimiento"
                                            >
                                                <Pencil />
                                            </Link>
                                        </Button>
                                        <DeleteEstablishment
                                            establishment={establishment}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
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

function DeleteTaxpayer({ taxpayer }: { taxpayer: Taxpayer }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Trash2 className="text-red-600 dark:text-red-400" />
                    Eliminar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>¿Eliminar este contribuyente?</DialogTitle>
                <DialogDescription>
                    Se eliminará a {taxpayer.name}. Solo es posible si no tiene
                    establecimientos registrados.
                </DialogDescription>

                <Form
                    noValidate
                    {...TaxpayerController.destroy.form(taxpayer.id)}
                >
                    {({ processing }) => (
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button variant="destructive" disabled={processing}>
                                {processing && <Spinner />}
                                Eliminar
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteEstablishment({
    establishment,
}: {
    establishment: Establishment;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar establecimiento"
                >
                    <Trash2 className="text-red-600 dark:text-red-400" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>¿Eliminar este establecimiento?</DialogTitle>
                <DialogDescription>
                    Se eliminará {establishment.activity} en{' '}
                    {establishment.full_address}.
                </DialogDescription>

                <Form
                    noValidate
                    {...EstablishmentController.destroy.form(establishment.id)}
                    options={{ preserveScroll: true }}
                >
                    {({ processing }) => (
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button variant="destructive" disabled={processing}>
                                {processing && <Spinner />}
                                Eliminar
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

TaxpayerShow.layout = ({ taxpayer }: Props) => ({
    breadcrumbs: [
        { title: 'Contribuyentes', href: index() },
        { title: taxpayer.name, href: show(taxpayer.id) },
    ],
});
