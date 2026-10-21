import { useFormContext } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import type {
    DocumentLookupResult,
    DocumentTypeOption,
    DocumentTypeValue,
    Taxpayer,
} from '@/types';

type TaxpayerFormData = Omit<
    Taxpayer,
    'id' | 'legacy_procedure_id' | 'created_at' | 'updated_at'
>;

type Lookup =
    | { status: 'idle' | 'loading' }
    | { status: 'error'; message: string }
    | { status: 'found'; message: string; warning?: boolean };

/**
 * Taxpayer fields with a RENIEC/SUNAT lookup that fills name and address.
 * Must be rendered inside an Inertia <Form noValidate> (Precognition).
 * Reusable wherever a taxpayer is registered (e.g. a new procedure).
 */
export default function TaxpayerFormFields({
    taxpayer,
    documentTypes,
}: {
    taxpayer?: Taxpayer;
    documentTypes: DocumentTypeOption[];
}) {
    const form = useFormContext<TaxpayerFormData>();
    const [documentType, setDocumentType] = useState<DocumentTypeValue>(
        taxpayer?.document_type ?? 'dni',
    );
    const [documentNumber, setDocumentNumber] = useState(
        taxpayer?.document_number ?? '',
    );
    const [values, setValues] = useState({
        name: taxpayer?.name ?? '',
        address: taxpayer?.address ?? '',
        district: taxpayer?.district ?? '',
        province: taxpayer?.province ?? '',
        department: taxpayer?.department ?? '',
    });
    const [lookup, setLookup] = useState<Lookup>({ status: 'idle' });

    const isCompany = documentType === 'ruc' && documentNumber.startsWith('20');

    const set =
        (field: keyof typeof values) =>
        (event: React.ChangeEvent<HTMLInputElement>) =>
            setValues((current) => ({
                ...current,
                [field]: event.target.value,
            }));

    async function search() {
        setLookup({ status: 'loading' });

        const response = await fetch(
            TaxpayerController.lookup.url({
                query: {
                    document_type: documentType,
                    number: documentNumber.trim(),
                },
            }),
            { headers: { Accept: 'application/json' } },
        ).catch(() => null);

        const body = await response?.json().catch(() => null);

        if (!response?.ok) {
            setLookup({
                status: 'error',
                message:
                    body?.errors?.number?.[0] ??
                    body?.message ??
                    'No se pudo realizar la consulta.',
            });

            return;
        }

        const result = body as DocumentLookupResult;

        if (result.source === 'local') {
            setLookup({
                status: 'found',
                warning: result.taxpayer.id !== taxpayer?.id,
                message:
                    result.taxpayer.id === taxpayer?.id
                        ? 'Es este mismo contribuyente.'
                        : `Ya está registrado como ${result.taxpayer.name}.`,
            });

            return;
        }

        const { data } = result;

        setValues((current) => ({
            name: data.name,
            address: data.address ?? current.address,
            district: data.district ?? current.district,
            province: data.province ?? current.province,
            department: data.department ?? current.department,
        }));

        const inactive =
            result.source === 'sunat' &&
            (data.sunat_status !== 'ACTIVO' ||
                data.sunat_condition !== 'HABIDO');

        setLookup({
            status: 'found',
            warning: inactive,
            message:
                result.source === 'sunat'
                    ? `SUNAT: ${data.sunat_status ?? '—'} / ${data.sunat_condition ?? '—'}`
                    : 'Datos obtenidos de RENIEC.',
        });
    }

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <div className="grid gap-2">
                    <Label htmlFor="document_type">Tipo de documento</Label>
                    <input
                        type="hidden"
                        name="document_type"
                        value={documentType}
                    />
                    <Select
                        value={documentType}
                        onValueChange={(value) => {
                            setDocumentType(value as DocumentTypeValue);
                            setLookup({ status: 'idle' });
                        }}
                    >
                        <SelectTrigger id="document_type" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {documentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form?.errors.document_type} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="document_number">Número</Label>
                    <div className="flex gap-2">
                        <Input
                            id="document_number"
                            name="document_number"
                            value={documentNumber}
                            onChange={(event) => {
                                setDocumentNumber(event.target.value);
                                setLookup({ status: 'idle' });
                            }}
                            onBlur={() => form?.validate('document_number')}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    search();
                                }
                            }}
                            inputMode={
                                documentType === 'ce' ? 'text' : 'numeric'
                            }
                            aria-invalid={
                                form?.errors.document_number ? true : undefined
                            }
                            autoFocus
                        />
                        {documentType !== 'ce' && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={search}
                                disabled={
                                    lookup.status === 'loading' ||
                                    documentNumber.trim() === ''
                                }
                            >
                                {lookup.status === 'loading' ? (
                                    <Spinner />
                                ) : (
                                    <Search />
                                )}
                                Consultar
                            </Button>
                        )}
                    </div>
                    {(lookup.status === 'found' ||
                        lookup.status === 'error') && (
                        <p
                            className={
                                lookup.status === 'error' ||
                                (lookup.status === 'found' && lookup.warning)
                                    ? 'text-sm text-amber-600 dark:text-amber-400'
                                    : 'text-sm text-muted-foreground'
                            }
                        >
                            {lookup.message}
                        </p>
                    )}
                    <InputError message={form?.errors.document_number} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="name">
                    {isCompany ? 'Razón social' : 'Apellidos y nombres'}
                </Label>
                <Input
                    id="name"
                    name="name"
                    value={values.name}
                    onChange={set('name')}
                    onBlur={() => form?.validate('name')}
                    aria-invalid={form?.errors.name ? true : undefined}
                />
                <InputError message={form?.errors.name} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {documentType !== 'ruc' && (
                    <div className="grid gap-2">
                        <Label htmlFor="ruc">RUC (opcional)</Label>
                        <Input
                            id="ruc"
                            name="ruc"
                            inputMode="numeric"
                            defaultValue={taxpayer?.ruc ?? ''}
                            onBlur={() => form?.validate('ruc')}
                            aria-invalid={form?.errors.ruc ? true : undefined}
                            placeholder="10…"
                        />
                        <InputError message={form?.errors.ruc} />
                    </div>
                )}

                <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                        id="phone"
                        name="phone"
                        inputMode="tel"
                        defaultValue={taxpayer?.phone ?? ''}
                        onBlur={() => form?.validate('phone')}
                        aria-invalid={form?.errors.phone ? true : undefined}
                    />
                    <InputError message={form?.errors.phone} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Correo</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        defaultValue={taxpayer?.email ?? ''}
                        onBlur={() => form?.validate('email')}
                        aria-invalid={form?.errors.email ? true : undefined}
                    />
                    <InputError message={form?.errors.email} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Domicilio fiscal</Label>
                <Input
                    id="address"
                    name="address"
                    value={values.address}
                    onChange={set('address')}
                    onBlur={() => form?.validate('address')}
                    aria-invalid={form?.errors.address ? true : undefined}
                />
                <InputError message={form?.errors.address} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {(['district', 'province', 'department'] as const).map(
                    (field) => (
                        <div key={field} className="grid gap-2">
                            <Label htmlFor={field}>
                                {
                                    {
                                        district: 'Distrito',
                                        province: 'Provincia',
                                        department: 'Departamento',
                                    }[field]
                                }
                            </Label>
                            <Input
                                id={field}
                                name={field}
                                value={values[field]}
                                onChange={set(field)}
                                onBlur={() => form?.validate(field)}
                                aria-invalid={
                                    form?.errors[field] ? true : undefined
                                }
                            />
                            <InputError message={form?.errors[field]} />
                        </div>
                    ),
                )}
            </div>

            {isCompany && (
                <>
                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="representative_name">
                                Representante legal
                            </Label>
                            <Input
                                id="representative_name"
                                name="representative_name"
                                defaultValue={
                                    taxpayer?.representative_name ?? ''
                                }
                                onBlur={() =>
                                    form?.validate('representative_name')
                                }
                            />
                            <InputError
                                message={form?.errors.representative_name}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="representative_document">
                                DNI del representante
                            </Label>
                            <Input
                                id="representative_document"
                                name="representative_document"
                                inputMode="numeric"
                                defaultValue={
                                    taxpayer?.representative_document ?? ''
                                }
                                onBlur={() =>
                                    form?.validate('representative_document')
                                }
                            />
                            <InputError
                                message={form?.errors.representative_document}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="representative_sunarp">
                                Partida registral (SUNARP)
                            </Label>
                            <Input
                                id="representative_sunarp"
                                name="representative_sunarp"
                                defaultValue={
                                    taxpayer?.representative_sunarp ?? ''
                                }
                                onBlur={() =>
                                    form?.validate('representative_sunarp')
                                }
                            />
                            <InputError
                                message={form?.errors.representative_sunarp}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="representative_phone">
                                Teléfono del representante
                            </Label>
                            <Input
                                id="representative_phone"
                                name="representative_phone"
                                inputMode="tel"
                                defaultValue={
                                    taxpayer?.representative_phone ?? ''
                                }
                                onBlur={() =>
                                    form?.validate('representative_phone')
                                }
                            />
                            <InputError
                                message={form?.errors.representative_phone}
                            />
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
