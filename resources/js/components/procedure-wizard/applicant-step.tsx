import { CircleCheck, Search, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type {
    DocumentLookupResult,
    DocumentTypeOption,
    DocumentTypeValue,
} from '@/types';
import { emptyTaxpayer } from './types';
import type {
    Applicant,
    Declaration,
    NewTaxpayer,
    RepresentativeField,
} from './types';
import { WizardField, WizardInput } from './wizard-field';

/**
 * Step 2: who asks. Search by DNI/RUC; a registered taxpayer is picked, an
 * unknown one is filled from RENIEC/SUNAT right here (created with the
 * procedure, no detour to another screen). Once chosen, the legal
 * representative or attorney (DJ sections 20-23) is declared for this
 * procedure, prefilled from the taxpayer's file.
 */
export default function ApplicantStep({
    applicant,
    newTaxpayer,
    documentTypes,
    errors,
    onPick,
    onNew,
    onChangeNew,
    onClear,
    representative,
    onChangeRepresentative,
}: {
    applicant: Applicant | null;
    newTaxpayer: NewTaxpayer | null;
    representative: Pick<Declaration, RepresentativeField>;
    onChangeRepresentative: (field: RepresentativeField, value: string) => void;
    documentTypes: DocumentTypeOption[];
    errors: Record<string, string | undefined>;
    onPick: (applicant: Applicant) => void;
    onNew: (taxpayer: NewTaxpayer) => void;
    onChangeNew: (field: keyof NewTaxpayer, value: string) => void;
    onClear: () => void;
}) {
    const [documentType, setDocumentType] = useState<DocumentTypeValue>('dni');
    const [number, setNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function search() {
        if (number.trim() === '') {
            return;
        }

        setLoading(true);
        setMessage(null);

        const response = await fetch(
            TaxpayerController.lookup.url({
                query: { document_type: documentType, number: number.trim() },
            }),
            { headers: { Accept: 'application/json' } },
        ).catch(() => null);
        const body = await response?.json().catch(() => null);

        setLoading(false);

        if (response?.status === 422) {
            setMessage(body?.errors?.number?.[0] ?? 'Número no válido.');

            return;
        }

        if (response?.ok && (body as DocumentLookupResult).source === 'local') {
            const { taxpayer } = body as Extract<
                DocumentLookupResult,
                { source: 'local' }
            >;
            onPick(taxpayer);

            return;
        }

        // Not registered: start a new taxpayer, prefilled when RENIEC/SUNAT answered.
        const taxpayer = emptyTaxpayer(
            documentType,
            number.trim().toUpperCase(),
        );

        if (response?.ok) {
            const { data } = body as Extract<
                DocumentLookupResult,
                { source: 'reniec' | 'sunat' }
            >;
            onNew({
                ...taxpayer,
                name: data.name,
                address: data.address ?? '',
                district: data.district ?? taxpayer.district,
                province: data.province ?? taxpayer.province,
                department: data.department ?? taxpayer.department,
            });
            setMessage(
                data.sunat_status
                    ? `Datos de SUNAT: ${data.sunat_status} / ${data.sunat_condition ?? '—'}`
                    : 'Datos de RENIEC. Completa teléfono y domicilio.',
            );
        } else {
            onNew(taxpayer);
            setMessage(
                body?.message ??
                    'No se pudo consultar. Ingresa los datos manualmente.',
            );
        }
    }

    const representativeFields = (
        <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">
                Representante legal o apoderado (opcional)
            </legend>
            <div className="grid gap-4 md:grid-cols-4">
                {(
                    [
                        ['representative_name', 'Apellidos y nombres'],
                        ['representative_document', 'N° de DNI o CE'],
                        ['representative_sunarp', 'N° de partida (SUNARP)'],
                        ['representative_phone', 'Teléfono'],
                    ] as const
                ).map(([key, label]) => (
                    <WizardInput
                        key={key}
                        id={`declaration_${key}`}
                        label={label}
                        value={representative[key]}
                        onChange={(value) => onChangeRepresentative(key, value)}
                        error={errors[`declaration.${key}`]}
                        className={
                            key === 'representative_name'
                                ? 'md:col-span-4'
                                : undefined
                        }
                    />
                ))}
            </div>
        </fieldset>
    );

    if (applicant) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-3">
                        <CircleCheck className="size-6 text-emerald-600" />
                        <div>
                            <div className="font-medium">{applicant.name}</div>
                            <div className="text-sm text-muted-foreground">
                                {applicant.document_type.toUpperCase()}{' '}
                                {applicant.document_number}
                                {applicant.ruc && ` · RUC ${applicant.ruc}`}
                                {applicant.address && ` · ${applicant.address}`}
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-300">
                                Contribuyente registrado
                            </div>
                        </div>
                    </div>
                    <Button type="button" variant="outline" onClick={onClear}>
                        <X />
                        Cambiar solicitante
                    </Button>
                </div>
                {representativeFields}
            </div>
        );
    }

    if (newTaxpayer) {
        const isCompany =
            newTaxpayer.document_type === 'ruc' &&
            newTaxpayer.document_number.startsWith('20');
        const field = (key: keyof NewTaxpayer) => ({
            id: `taxpayer_${key}`,
            value: newTaxpayer[key],
            onChange: (value: string) => onChangeNew(key, value),
            error: errors[`taxpayer.${key}`],
        });

        return (
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-sky-500/40 bg-sky-500/5 p-4">
                    <div className="flex items-center gap-3">
                        <UserPlus className="size-6 text-sky-600" />
                        <div>
                            <div className="font-medium">
                                Nuevo contribuyente:{' '}
                                {newTaxpayer.document_type.toUpperCase()}{' '}
                                {newTaxpayer.document_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {message ??
                                    'Se registrará junto con el trámite.'}
                            </div>
                        </div>
                    </div>
                    <Button type="button" variant="outline" onClick={onClear}>
                        <X />
                        Buscar otro documento
                    </Button>
                </div>
                <InputError message={errors['taxpayer.document_number']} />

                <div className="grid gap-4 md:grid-cols-4">
                    <WizardInput
                        {...field('name')}
                        label={
                            isCompany ? 'Razón social' : 'Apellidos y nombres'
                        }
                        className="md:col-span-3"
                    />
                    {newTaxpayer.document_type !== 'ruc' && (
                        <WizardInput
                            {...field('ruc')}
                            label="RUC (opcional)"
                            inputMode="numeric"
                        />
                    )}
                    <WizardInput
                        {...field('phone')}
                        label="Teléfono"
                        inputMode="tel"
                    />
                    <WizardInput
                        {...field('email')}
                        label="Correo"
                        type="email"
                        className="md:col-span-2"
                    />
                    <WizardInput
                        {...field('address')}
                        label="Domicilio fiscal"
                        className="md:col-span-4"
                    />
                    <WizardInput {...field('district')} label="Distrito" />
                    <WizardInput {...field('province')} label="Provincia" />
                    <WizardInput
                        {...field('department')}
                        label="Departamento"
                    />
                </div>

                {representativeFields}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <WizardField
                    id="lookup_type"
                    label="Tipo de documento"
                    className="w-56"
                >
                    <FormSelect
                        id="lookup_type"
                        name="lookup_type"
                        options={documentTypes}
                        defaultValue={documentType}
                        onValueChange={(value) =>
                            setDocumentType(value as DocumentTypeValue)
                        }
                    />
                </WizardField>
                <WizardField id="lookup_number" label="Número" className="w-64">
                    <Input
                        id="lookup_number"
                        value={number}
                        onChange={(event) => setNumber(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                search();
                            }
                        }}
                        inputMode={documentType === 'ce' ? 'text' : 'numeric'}
                        autoFocus
                    />
                </WizardField>
                <Button
                    type="button"
                    onClick={search}
                    disabled={loading || number.trim() === ''}
                >
                    {loading ? <Spinner /> : <Search />}
                    Buscar
                </Button>
            </div>
            {message && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                    {message}
                </p>
            )}
            <InputError message={errors.taxpayer ?? errors.taxpayer_id} />
            <p className="text-sm text-muted-foreground">
                Si ya está registrado se selecciona; si no, se traen sus datos
                de RENIEC o SUNAT y se registra junto con el trámite.
            </p>
        </div>
    );
}
