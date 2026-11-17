import { Head, Link, useForm } from '@inertiajs/react';
import { Lock, Save } from 'lucide-react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import AreaInput from '@/components/area-input';
import FormSelect from '@/components/form-select';
import DeclarationFields from '@/components/procedure-wizard/declaration-fields';
import TypesStep from '@/components/procedure-wizard/types-step';
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

type Applicant = Record<(typeof APPLICANT_FIELDS)[number], string>;
type Premises = Record<(typeof PREMISES_FIELDS)[number], string>;
type Stored = Record<string, string | number | null>;

type Props = {
    procedure: {
        id: number;
        code: string;
        status: string;
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
 * taxpayer's record or its other procedures.
 */
export default function ProcedureEdit({
    procedure,
    canChangeTypes,
    procedureTypes,
    documentTypes,
    establishmentOptions: options,
}: Props) {
    const capacityFor = useCapacityFor();
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

    const isCompany =
        form.data.applicant.document_type === 'ruc' &&
        form.data.applicant.document_number.startsWith('20');

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
                className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8"
            >
                <header>
                    <h1 className="font-display text-2xl font-bold">
                        Editar trámite {procedure.code}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Corrige lo que haga falta: los cambios quedan solo en
                        este trámite (su declaración jurada, orden de pago y
                        licencia), no en la ficha del contribuyente ni en sus
                        otros trámites. Se puede editar hasta que esté pagado y
                        con la declaración jurada recepcionada.
                    </p>
                </header>

                <Card title="Tipos de trámite">
                    {canChangeTypes ? (
                        <TypesStep
                            procedureTypes={procedureTypes}
                            selected={form.data.procedure_type_ids}
                            onChange={(ids) =>
                                form.setData('procedure_type_ids', ids)
                            }
                            error={
                                errors.procedure_type_ids ??
                                Object.entries(errors).find(([key]) =>
                                    key.startsWith('procedure_type_ids.'),
                                )?.[1]
                            }
                        />
                    ) : (
                        <div className="space-y-2 text-sm">
                            <ul className="list-inside list-disc">
                                {procedure.types.map((type) => (
                                    <li key={type.id}>{type.name}</li>
                                ))}
                            </ul>
                            <p className="flex items-center gap-2 text-muted-foreground">
                                <Lock className="size-4 shrink-0" />
                                Ya tiene orden de pago: los tipos de trámite (y
                                su monto) no se cambian.
                            </p>
                            {errors.procedure_type_ids && (
                                <p className="text-destructive">
                                    {errors.procedure_type_ids}
                                </p>
                            )}
                        </div>
                    )}
                </Card>

                <Card title="Datos del solicitante">
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
                                    form.data.applicant.document_type || null
                                }
                                onValueChange={(value) =>
                                    setApplicant('document_type', value)
                                }
                            />
                        </WizardField>
                        <WizardInput
                            {...applicant('document_number')}
                            label="N° de documento"
                        />
                        {form.data.applicant.document_type !== 'ruc' && (
                            <WizardInput
                                {...applicant('ruc')}
                                label="RUC (opcional)"
                                inputMode="numeric"
                            />
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
                        <WizardInput
                            {...applicant('address')}
                            label="Domicilio fiscal (Av./Jr./Ca./Pje.)"
                            className="md:col-span-4"
                        />
                        <WizardInput {...applicant('number')} label="Nro." />
                        <WizardInput {...applicant('interior')} label="Int" />
                        <WizardInput {...applicant('block')} label="Mz" />
                        <WizardInput {...applicant('lot')} label="Lt" />
                        <WizardInput
                            {...applicant('settlement')}
                            label="Urb., AA.HH., Barrio, Otros"
                            className="md:col-span-4"
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
                    </div>
                </Card>

                <Card title="Representante legal o apoderado (opcional)">
                    <div className="grid gap-4 md:grid-cols-4">
                        {(
                            [
                                ['representative_name', 'Apellidos y nombres'],
                                ['representative_document', 'N° de DNI o CE'],
                                [
                                    'representative_sunarp',
                                    'N° de partida (SUNARP)',
                                ],
                                ['representative_phone', 'Teléfono'],
                            ] as const
                        ).map(([key, label]) => (
                            <WizardInput
                                key={key}
                                id={`declaration_${key}`}
                                label={label}
                                value={form.data.declaration[key]}
                                onChange={(value) => setDeclaration(key, value)}
                                error={errors[`declaration.${key}`]}
                                className={
                                    key === 'representative_name'
                                        ? 'md:col-span-4'
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                </Card>

                <Card title="Datos del establecimiento">
                    <div className="space-y-4">
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
                        </div>
                        <div className="grid gap-4 md:grid-cols-6">
                            {select(
                                'settlement_type',
                                'Tipo de habilitación',
                                options.settlementTypes,
                            )}
                            <WizardInput
                                {...premises('settlement_name')}
                                label="Urb., AA.HH., barrio"
                                className="md:col-span-2"
                            />
                            {select(
                                'street_type',
                                'Tipo de vía',
                                options.streetTypes,
                            )}
                            <WizardInput
                                {...premises('street')}
                                label="Nombre de la vía"
                                className="md:col-span-2"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-8">
                            <WizardInput {...premises('number')} label="N°" />
                            <WizardInput
                                {...premises('interior')}
                                label="Int."
                            />
                            <WizardInput {...premises('block')} label="Mz." />
                            <WizardInput {...premises('lot')} label="Lt." />
                            <div className="col-span-2">
                                <AreaInput
                                    id="premises_area"
                                    value={form.data.premises.area}
                                    onChange={(value) =>
                                        setPremises('area', value)
                                    }
                                    error={errors['premises.area']}
                                    dimensions={{
                                        length: form.data.declaration.length,
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
                            {select(
                                'risk_level',
                                'Nivel de riesgo',
                                options.riskLevels,
                            )}
                        </div>
                    </div>
                </Card>

                <DeclarationFields
                    dimensionsAbove
                    declaration={form.data.declaration}
                    errors={errors}
                    onChange={setDeclaration}
                />

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

function Card({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
            <h2 className="font-display text-lg font-bold">{title}</h2>
            {children}
        </section>
    );
}

ProcedureEdit.layout = ({ procedure }: Props) => ({
    breadcrumbs: [
        { title: 'Trámites', href: index() },
        { title: procedure.code, href: show(procedure.id) },
        { title: 'Editar', href: edit(procedure.id) },
    ],
});
