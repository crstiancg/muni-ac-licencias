import { Head, Link, useForm } from '@inertiajs/react';
import {
    Info,
    Lock,
    MapPin,
    Pencil,
    Save,
    Store,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import AreaInput from '@/components/area-input';
import DocumentLookupInput from '@/components/document-lookup-input';
import type { OfficialData } from '@/components/document-lookup-input';
import FormSelect from '@/components/form-select';
import ProcedureStatusBadge from '@/components/procedure-status-badge';
import DeclarationFields from '@/components/procedure-wizard/declaration-fields';
import TypesStep, { formatFee } from '@/components/procedure-wizard/types-step';
import {
    declarationFrom,
    type Declaration,
    type StoredDeclaration,
} from '@/components/procedure-wizard/types';
import {
    WizardField,
    WizardInput,
} from '@/components/procedure-wizard/wizard-field';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCapacityFor } from '@/hooks/use-capacity';
import { edit, index, show } from '@/routes/procedures';
import type {
    DocumentTypeOption,
    EstablishmentOptions,
    ProcedureStatusValue,
    ProcedureTypeOption,
} from '@/types';

const APPLICANT_FIELDS = [
    'document_type',
    'document_number',
    'ruc',
    'name',
    'email',
    'phone',
    'address',
    'number',
    'interior',
    'block',
    'lot',
    'settlement',
    'district',
    'province',
    'department',
] as const;

const PREMISES_FIELDS = [
    'trade_name',
    'activity',
    'economic_sector',
    'street_type',
    'street',
    'number',
    'interior',
    'block',
    'lot',
    'settlement_type',
    'settlement_name',
    'area',
    'capacity',
    'risk_level',
] as const;

const REPRESENTATIVE = [
    ['representative_name', 'Apellidos y nombres', 'md:col-span-3'],
    ['representative_document', 'N° de DNI o CE', 'md:col-span-2'],
    ['representative_phone', 'Teléfono', ''],
] as const;

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

type Applicant = Record<(typeof APPLICANT_FIELDS)[number], string>;
type Premises = Record<(typeof PREMISES_FIELDS)[number], string>;
type Stored = Record<string, string | number | null>;

type Props = {
    procedure: {
        id: number;
        code: string;
        status: ProcedureStatusValue;
        status_label: string;
        applicant: Stored;
        premises: Stored;
        declaration: Partial<StoredDeclaration>;
        type_ids: number[];
        types: { id: number; name: string }[];
    };
    canChangeTypes: boolean;
    procedureTypes: ProcedureTypeOption[];
    documentTypes: DocumentTypeOption[];
    establishmentOptions: EstablishmentOptions;
};

/** Stored values (null, numbers) as the text the inputs edit. */
const asText = <K extends string>(
    fields: readonly K[],
    stored: Stored,
): Record<K, string> =>
    Object.fromEntries(
        fields.map((field) => [field, (stored[field] ?? '').toString()]),
    ) as Record<K, string>;

/**
 * Corrects every field of the procedure as declared: applicant,
 * establishment and sworn declaration. Only this procedure changes, not the
 * taxpayer's record or its other procedures. Laid out like the wizard: the
 * form on the left, a summary on the right.
 */
export default function ProcedureEdit({
    procedure,
    canChangeTypes,
    procedureTypes,
    documentTypes,
    establishmentOptions: options,
}: Props) {
    const capacityFor = useCapacityFor();
    const [pickingTypes, setPickingTypes] = useState(false);
    const form = useForm<{
        procedure_type_ids: number[];
        applicant: Applicant;
        premises: Premises;
        declaration: Declaration;
    }>({
        procedure_type_ids: procedure.type_ids,
        applicant: asText(APPLICANT_FIELDS, procedure.applicant),
        premises: asText(PREMISES_FIELDS, procedure.premises),
        declaration: declarationFrom(procedure.declaration),
    });
    const errors = form.errors as Record<string, string | undefined>;
    const typesError =
        errors.procedure_type_ids ??
        Object.entries(errors).find(([key]) =>
            key.startsWith('procedure_type_ids.'),
        )?.[1];

    const selectedTypes = form.data.procedure_type_ids.map(
        (id) =>
            procedureTypes.find((type) => type.id === id) ?? {
                id,
                name:
                    procedure.types.find((type) => type.id === id)?.name ??
                    `#${id}`,
                fee: null,
            },
    );
    const total = selectedTypes.reduce(
        (sum, type) => sum + Number(type.fee ?? 0),
        0,
    );

    const setApplicant = (key: keyof Applicant, value: string) =>
        form.setData((data) => ({
            ...data,
            applicant: { ...data.applicant, [key]: value },
        }));

    const setPremises = (key: keyof Premises, value: string) =>
        form.setData((data) => {
            const premises = { ...data.premises, [key]: value };

            // A new area re-suggests the capacity unless the clerk typed one.
            if (
                key === 'area' &&
                (data.premises.capacity === '' ||
                    data.premises.capacity === capacityFor(data.premises.area))
            ) {
                premises.capacity = capacityFor(value);
            }

            return { ...data, premises };
        });

    const setDeclaration = <K extends keyof Declaration>(
        key: K,
        value: Declaration[K],
    ) =>
        form.setData((data) => ({
            ...data,
            declaration: { ...data.declaration, [key]: value },
        }));

    const applicant = (key: keyof Applicant) => ({
        id: `applicant_${key}`,
        value: form.data.applicant[key],
        onChange: (value: string) => setApplicant(key, value),
        error: errors[`applicant.${key}`],
    });

    const premises = (key: keyof Premises) => ({
        id: `premises_${key}`,
        value: form.data.premises[key],
        onChange: (value: string) => setPremises(key, value),
        error: errors[`premises.${key}`],
    });

    const select = (
        key:
            | 'economic_sector'
            | 'street_type'
            | 'settlement_type'
            | 'risk_level',
        label: string,
        choices: { value: string; label: string }[],
    ) => (
        <WizardField
            id={`premises_${key}`}
            label={label}
            error={errors[`premises.${key}`]}
        >
            <FormSelect
                id={`premises_${key}`}
                name={`premises_${key}`}
                options={choices}
                defaultValue={form.data.premises[key] || null}
                emptyLabel="—"
                onValueChange={(value) => setPremises(key, value)}
                invalid={!!errors[`premises.${key}`]}
            />
        </WizardField>
    );

    const { applicant: person, premises: place } = form.data;
    // A representative's CE has letters; digits are asked as a DNI.
    const representativeType = /[^\d\s]/.test(
        form.data.declaration.representative_document,
    )
        ? 'ce'
        : 'dni';

    // RENIEC brings the name; SUNAT also the fiscal address.
    const fillApplicant = (data: OfficialData) =>
        form.setData((current) => ({
            ...current,
            applicant: {
                ...current.applicant,
                name: data.name,
                address: data.address ?? current.applicant.address,
                district: data.district ?? current.applicant.district,
                province: data.province ?? current.applicant.province,
                department: data.department ?? current.applicant.department,
            },
        }));
    const isCompany =
        person.document_type === 'ruc' &&
        person.document_number.startsWith('20');
    const placeAddress = [
        place.street,
        place.number,
        place.interior && `Int. ${place.interior}`,
        place.block && `Mz. ${place.block}`,
        place.lot && `Lt. ${place.lot}`,
    ]
        .filter(Boolean)
        .join(' ');

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.put(ProcedureController.update.url(procedure.id), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Editar trámite ${procedure.code}`} />

            <form
                onSubmit={submit}
                className="flex w-full flex-col gap-5 p-4 md:p-6"
            >
                <header className="space-y-1">
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Editar trámite
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-display text-2xl font-bold">
                            {procedure.code}
                        </h1>
                        <ProcedureStatusBadge
                            status={procedure.status}
                            label={procedure.status_label}
                        />
                    </div>
                </header>

                <div className="flex flex-1 flex-wrap items-start gap-5">
                    <section className="min-w-0 flex-[3_1_640px] space-y-6 rounded-2xl border bg-card p-5 md:p-6">
                        <Section title="Tipos de trámite">
                            <div className="space-y-3">
                                <ul className="divide-y rounded-lg border text-sm">
                                    {selectedTypes.map((type) => (
                                        <li
                                            key={type.id}
                                            className="flex items-start justify-between gap-4 px-3 py-2.5"
                                        >
                                            <span>{type.name}</span>
                                            <span className="font-mono whitespace-nowrap tabular-nums">
                                                {formatFee(type.fee)}
                                            </span>
                                        </li>
                                    ))}
                                    {selectedTypes.length === 0 && (
                                        <li className="px-3 py-2.5 text-muted-foreground">
                                            Marca al menos uno.
                                        </li>
                                    )}
                                </ul>

                                {canChangeTypes ? (
                                    pickingTypes ? (
                                        <div className="space-y-3 rounded-lg border p-3">
                                            <TypesStep
                                                procedureTypes={procedureTypes}
                                                selected={
                                                    form.data.procedure_type_ids
                                                }
                                                onChange={(ids) =>
                                                    form.setData(
                                                        'procedure_type_ids',
                                                        ids,
                                                    )
                                                }
                                                error={typesError}
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    setPickingTypes(false)
                                                }
                                            >
                                                Listo
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setPickingTypes(true)
                                                }
                                            >
                                                <Pencil />
                                                Cambiar tipos de trámite
                                            </Button>
                                            {typesError && (
                                                <p className="text-sm text-destructive">
                                                    {typesError}
                                                </p>
                                            )}
                                        </>
                                    )
                                ) : (
                                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Lock className="size-4 shrink-0" />
                                        Ya tiene orden de pago: los tipos de
                                        trámite y su monto no se cambian.
                                        {typesError && (
                                            <span className="text-destructive">
                                                {typesError}
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </Section>

                        <Section title="Datos del solicitante">
                            <div className="grid gap-4 md:grid-cols-4">
                                <WizardField
                                    id="applicant_document_type"
                                    label="Tipo de documento"
                                    error={errors['applicant.document_type']}
                                >
                                    <FormSelect
                                        id="applicant_document_type"
                                        name="applicant_document_type"
                                        options={documentTypes}
                                        defaultValue={
                                            person.document_type || null
                                        }
                                        onValueChange={(value) =>
                                            setApplicant('document_type', value)
                                        }
                                    />
                                </WizardField>
                                <DocumentLookupInput
                                    {...applicant('document_number')}
                                    label="N° de documento"
                                    documentType={person.document_type}
                                    onFound={fillApplicant}
                                />
                                {person.document_type !== 'ruc' ? (
                                    <WizardInput
                                        {...applicant('ruc')}
                                        label="RUC (opcional)"
                                        inputMode="numeric"
                                    />
                                ) : (
                                    <div className="hidden md:block" />
                                )}
                                <WizardInput
                                    {...applicant('phone')}
                                    label="Teléfono"
                                    inputMode="tel"
                                />
                                <WizardInput
                                    {...applicant('name')}
                                    label={
                                        isCompany
                                            ? 'Razón social'
                                            : 'Apellidos y nombres'
                                    }
                                    className="md:col-span-3"
                                />
                                <WizardInput
                                    {...applicant('email')}
                                    label="Correo"
                                    type="email"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                                <WizardInput
                                    {...applicant('address')}
                                    label="Av./Jr./Ca./Pje."
                                    className="col-span-2 md:col-span-2"
                                />
                                <WizardInput
                                    {...applicant('number')}
                                    label="Nro."
                                />
                                <WizardInput
                                    {...applicant('interior')}
                                    label="Int"
                                />
                                <WizardInput
                                    {...applicant('block')}
                                    label="Mz"
                                />
                                <WizardInput {...applicant('lot')} label="Lt" />
                                <WizardInput
                                    {...applicant('settlement')}
                                    label="Urb., AA.HH., Barrio, Otros"
                                    className={
                                        isCompany
                                            ? 'col-span-2'
                                            : 'col-span-2 md:col-span-3'
                                    }
                                />
                                <WizardInput
                                    {...applicant('district')}
                                    label="Distrito"
                                />
                                <WizardInput
                                    {...applicant('province')}
                                    label="Provincia"
                                />
                                <WizardInput
                                    {...applicant('department')}
                                    label="Departamento"
                                />
                                {/* The company's registry entry: required for a RUC 20. */}
                                {isCompany && (
                                    <WizardInput
                                        id="declaration_representative_sunarp"
                                        label="N° de partida registral (SUNARP)"
                                        value={
                                            form.data.declaration
                                                .representative_sunarp
                                        }
                                        onChange={(value) =>
                                            setDeclaration(
                                                'representative_sunarp',
                                                value,
                                            )
                                        }
                                        error={
                                            errors[
                                                'declaration.representative_sunarp'
                                            ]
                                        }
                                    />
                                )}
                            </div>
                        </Section>

                        {/* Only a company (RUC 20) declares a legal representative. */}
                        {isCompany && (
                            <Section title="Representante legal">
                                <div className="grid gap-4 md:grid-cols-6">
                                    {REPRESENTATIVE.map(([key, label, span]) =>
                                        key === 'representative_document' ? (
                                            <DocumentLookupInput
                                                key={key}
                                                id={`declaration_${key}`}
                                                label={label}
                                                value={
                                                    form.data.declaration[key]
                                                }
                                                onChange={(value) =>
                                                    setDeclaration(key, value)
                                                }
                                                documentType={
                                                    representativeType
                                                }
                                                onFound={(data) =>
                                                    setDeclaration(
                                                        'representative_name',
                                                        data.name,
                                                    )
                                                }
                                                error={
                                                    errors[`declaration.${key}`]
                                                }
                                            />
                                        ) : (
                                            <WizardInput
                                                key={key}
                                                id={`declaration_${key}`}
                                                label={label}
                                                value={
                                                    form.data.declaration[key]
                                                }
                                                onChange={(value) =>
                                                    setDeclaration(key, value)
                                                }
                                                error={
                                                    errors[`declaration.${key}`]
                                                }
                                                className={span || undefined}
                                            />
                                        ),
                                    )}
                                </div>
                            </Section>
                        )}

                        <Section title="Datos del establecimiento">
                            <div className="grid gap-4 md:grid-cols-4">
                                <WizardInput
                                    {...premises('activity')}
                                    label="Giro"
                                    className="md:col-span-2"
                                />
                                <WizardInput
                                    {...premises('trade_name')}
                                    label="Nombre comercial (opcional)"
                                />
                                {select(
                                    'economic_sector',
                                    'Sector',
                                    options.economicSectors,
                                )}
                                {select(
                                    'street_type',
                                    'Tipo de vía',
                                    options.streetTypes,
                                )}
                                <WizardInput
                                    {...premises('street')}
                                    label="Nombre de la vía"
                                    className="md:col-span-3"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                                <WizardInput
                                    {...premises('number')}
                                    label="N°"
                                />
                                <WizardInput
                                    {...premises('interior')}
                                    label="Int."
                                />
                                <WizardInput
                                    {...premises('block')}
                                    label="Mz."
                                />
                                <WizardInput {...premises('lot')} label="Lt." />
                                {select(
                                    'settlement_type',
                                    'Tipo de habilitación',
                                    options.settlementTypes,
                                )}
                                <WizardInput
                                    {...premises('settlement_name')}
                                    label="Urb., AA.HH., barrio"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                                <div className="col-span-2 md:col-span-3">
                                    <AreaInput
                                        id="premises_area"
                                        value={place.area}
                                        onChange={(value) =>
                                            setPremises('area', value)
                                        }
                                        error={errors['premises.area']}
                                        dimensions={{
                                            length: form.data.declaration
                                                .length,
                                            width: form.data.declaration.width,
                                        }}
                                        onDimensionsChange={(length, width) =>
                                            form.setData((data) => ({
                                                ...data,
                                                declaration: {
                                                    ...data.declaration,
                                                    length,
                                                    width,
                                                },
                                            }))
                                        }
                                    />
                                </div>
                                <WizardInput
                                    {...premises('capacity')}
                                    label="Aforo"
                                    type="number"
                                    inputMode="numeric"
                                />
                                <div className="md:col-span-2">
                                    {select(
                                        'risk_level',
                                        'Nivel de riesgo',
                                        options.riskLevels,
                                    )}
                                </div>
                            </div>
                        </Section>

                        <DeclarationFields
                            dimensionsAbove
                            declaration={form.data.declaration}
                            errors={errors}
                            onChange={setDeclaration}
                        />
                    </section>

                    <aside
                        aria-label="Resumen del trámite"
                        className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-4"
                    >
                        <h2 className="text-lg font-bold">Resumen</h2>

                        <SummaryBlock label="Tipos de trámite">
                            <ul className="space-y-2 text-sm">
                                {selectedTypes.map((type) => (
                                    <li
                                        key={type.id}
                                        className="flex justify-between gap-3"
                                    >
                                        <span className="line-clamp-2">
                                            {type.name}
                                        </span>
                                        <span className="font-mono whitespace-nowrap tabular-nums">
                                            {formatFee(type.fee)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </SummaryBlock>

                        <div className="rounded-xl bg-sidebar px-4 py-3 text-sidebar-foreground">
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-sm font-semibold">
                                    Total
                                </span>
                                <span className="font-display text-2xl font-bold text-white tabular-nums">
                                    {currency.format(total)}
                                </span>
                            </div>
                            <p className="mt-1 text-xs">
                                {canChangeTypes
                                    ? 'Referencial con la UIT del año. El monto se fija al emitir la orden de pago.'
                                    : 'Con la UIT de hoy. La orden de pago emitida conserva su monto.'}
                            </p>
                        </div>

                        <SummaryBlock label="Solicitante">
                            <SummaryItem
                                icon={<UserRound />}
                                title={person.name || '—'}
                                detail={`${person.document_type.toUpperCase()} ${person.document_number}`}
                            />
                        </SummaryBlock>

                        <SummaryBlock label="Establecimiento">
                            <SummaryItem
                                icon={<Store />}
                                title={
                                    place.trade_name || place.activity || '—'
                                }
                                detail={placeAddress}
                                pin
                            />
                        </SummaryBlock>

                        <div className="flex gap-2 rounded-xl border border-[#c9d9f3] bg-[#e6eefb] p-3 text-xs text-[#1f4e96] dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300">
                            <Info className="size-4 shrink-0" />
                            <p>
                                Los cambios quedan solo en este trámite: su
                                declaración jurada, orden de pago y licencia. La
                                ficha del contribuyente y sus otros trámites no
                                cambian. Se puede editar hasta que esté pagado y
                                con la declaración jurada recepcionada.
                            </p>
                        </div>
                    </aside>
                </div>

                {/* Floating action bar, as in the wizard. */}
                <footer className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
                    <Button type="button" variant="ghost" asChild>
                        <Link href={show(procedure.id)}>Cancelar</Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        {form.hasErrors && (
                            <span className="text-sm text-destructive">
                                Revisa los campos marcados.
                            </span>
                        )}
                        <Button disabled={form.processing}>
                            {form.processing ? <Spinner /> : <Save />}
                            Guardar cambios
                        </Button>
                    </div>
                </footer>
            </form>
        </>
    );
}

/** Same frame as the sworn declaration sections below. */
function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">{title}</legend>
            {children}
        </fieldset>
    );
}

function SummaryBlock({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2 border-t pt-4 first-of-type:border-t-0 first-of-type:pt-0">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            {children}
        </div>
    );
}

function SummaryItem({
    icon,
    title,
    detail,
    pin = false,
}: {
    icon: ReactNode;
    title: string;
    detail?: string;
    pin?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-link [&_svg]:size-4">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                {detail && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {pin && <MapPin className="size-3 shrink-0" />}
                        {detail}
                    </p>
                )}
            </div>
        </div>
    );
}

ProcedureEdit.layout = ({ procedure }: Props) => ({
    breadcrumbs: [
        { title: 'Trámites', href: index() },
        { title: procedure.code, href: show(procedure.id) },
        { title: 'Editar', href: edit(procedure.id) },
    ],
});
