import { Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    History,
    MapPin,
    Store,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCapacityFor } from '@/hooks/use-capacity';
import { cn } from '@/lib/utils';
import type {
    CurrentUit,
    DocumentTypeOption,
    ProcedureTypeOption,
} from '@/types';
import ApplicantStep from './applicant-step';
import DeclarationFields from './declaration-fields';
import EstablishmentStep from './establishment-step';
import {
    DECLARATION_FIELDS,
    ESTABLISHMENT_FIELDS,
    REPRESENTATIVE_FIELDS,
    TAXPAYER_FIELDS,
    declarationFrom,
    emptyDeclaration,
    emptyEstablishment,
    representativeOf,
} from './types';
import type {
    Applicant,
    Declaration,
    LastDeclaration,
    NewEstablishment,
    NewTaxpayer,
    PickedEstablishment,
    WizardData,
    WizardOptions,
} from './types';
import TypesStep, { formatFee } from './types-step';

const STEPS = [
    {
        title: 'Tipos de trámite',
        hint: 'Qué solicita',
        help: 'Marca los procedimientos del TUPA que pide el contribuyente.',
    },
    {
        title: 'Solicitante',
        hint: 'Quién lo solicita',
        help: 'Busca al contribuyente por DNI o RUC, o regístralo si es nuevo.',
    },
    {
        title: 'Establecimiento',
        hint: 'Dónde y declaración jurada',
        help: 'Elige el local (o regístralo) y completa la declaración jurada.',
    },
];

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const formatDate = (value: string) =>
    date.format(new Date(`${value}T12:00:00`));

/** The place's declaration with the representative typed in step 2. */
const keepRepresentative = (
    declaration: Declaration,
    current: Declaration,
): Declaration => ({
    ...declaration,
    ...Object.fromEntries(
        REPRESENTATIVE_FIELDS.map((key) => [key, current[key]]),
    ),
});

/** Step an error key belongs to, to jump there when the server rejects. */
const stepOf = (key: string) =>
    key.startsWith('procedure_type_ids')
        ? 0
        : key.startsWith('taxpayer') ||
            key.startsWith('declaration.representative_')
          ? 1
          : 2;

/**
 * Register or edit a procedure step by step, in the order clerks know from
 * the old system (types first). Each "Siguiente" validates its step on the
 * server (Precognition) and new taxpayers/establishments are created with
 * the procedure, so the clerk never leaves this screen. The last step also
 * takes the sworn declaration, printed right after registering; mesa de
 * partes data (expediente, folios) is recorded later on the procedure.
 */
export default function ProcedureWizard({
    title,
    description,
    action,
    initial,
    initialApplicant,
    procedureTypes,
    currentUit,
    documentTypes,
    options,
    cancelHref,
    submitLabel,
}: {
    title: string;
    description: string;
    action: { url: string; method: 'post' | 'put' };
    initial: WizardData;
    initialApplicant: Applicant | null;
    procedureTypes: ProcedureTypeOption[];
    currentUit: CurrentUit;
    documentTypes: DocumentTypeOption[];
    options: WizardOptions;
    cancelHref: string;
    submitLabel: string;
}) {
    const form = useForm<WizardData>(action, initial);
    const [step, setStep] = useState(0);
    const [applicant, setApplicant] = useState(initialApplicant);
    const [declarationSource, setDeclarationSource] =
        useState<LastDeclaration | null>(null);
    // Only for the summary: the place picked in step 3.
    const [picked, setPicked] = useState<PickedEstablishment | null>(null);
    const errors = form.errors as Record<string, string | undefined>;

    useEffect(() => {
        // "Siguiente" waits for the server: don't add Precognition's debounce.
        form.setValidationTimeout(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stepFields = (index: number): string[] => {
        switch (index) {
            case 0:
                return ['procedure_type_ids', 'procedure_type_ids.*'];
            case 1:
                return [
                    ...(form.data.taxpayer_id
                        ? ['taxpayer_id']
                        : [
                              'taxpayer',
                              ...TAXPAYER_FIELDS.map(
                                  (key) => `taxpayer.${key}`,
                              ),
                          ]),
                    ...REPRESENTATIVE_FIELDS.map((key) => `declaration.${key}`),
                ];
            default:
                return [
                    ...(form.data.establishment_id
                        ? ['establishment_id']
                        : [
                              'establishment',
                              ...ESTABLISHMENT_FIELDS.map(
                                  (key) => `establishment.${key}`,
                              ),
                          ]),
                    'declaration',
                    ...DECLARATION_FIELDS.map((key) => `declaration.${key}`),
                ];
        }
    };

    function next() {
        // `only` takes dotted paths the generated types don't model.
        form.validate({
            only: stepFields(step),
            onSuccess: () => setStep((current) => current + 1),
        } as never);
    }

    function submit() {
        form.submit(action.method, action.url, {
            onError: (serverErrors) => {
                const first = Object.keys(serverErrors)
                    .map(stepOf)
                    .sort((a, b) => a - b)[0];
                setStep(first ?? 2);
            },
        });
    }

    const setTaxpayerField = (field: keyof NewTaxpayer, value: string) =>
        form.setData((data) => ({
            ...data,
            taxpayer: data.taxpayer
                ? { ...data.taxpayer, [field]: value }
                : null,
        }));

    const capacityFor = useCapacityFor();

    const setEstablishmentField = (
        field: keyof NewEstablishment,
        value: string,
    ) =>
        form.setData((data) => {
            if (!data.establishment) {
                return data;
            }

            const establishment = { ...data.establishment, [field]: value };

            // A new area re-suggests the capacity unless the clerk typed one.
            if (
                field === 'area' &&
                (data.establishment.capacity === '' ||
                    data.establishment.capacity ===
                        capacityFor(data.establishment.area))
            ) {
                establishment.capacity = capacityFor(value);
            }

            return { ...data, establishment };
        });

    const setDeclarationField = <K extends keyof Declaration>(
        field: K,
        value: Declaration[K],
    ) =>
        form.setData((data) => ({
            ...data,
            declaration: { ...data.declaration, [field]: value },
        }));

    const selectedTypes = procedureTypes.filter((type) =>
        form.data.procedure_type_ids.includes(type.id),
    );

    return (
        <div className="flex min-h-full flex-1 flex-col gap-5 p-4 md:p-8">
            <div className="space-y-2.5">
                <Link
                    href={cancelHref}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline"
                >
                    <ArrowLeft className="size-4" />
                    Volver
                </Link>
                <Heading title={title} description={description} />
            </div>

            <ol
                aria-label="Pasos del registro"
                className="grid gap-2 rounded-2xl border bg-card p-2 md:grid-cols-3"
            >
                {STEPS.map((item, index) => {
                    const done = index < step;
                    const active = index === step;

                    return (
                        <li key={item.title}>
                            <button
                                type="button"
                                disabled={!done}
                                aria-current={active ? 'step' : undefined}
                                onClick={() => setStep(index)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                                    active && 'bg-accent',
                                    done && 'hover:bg-muted',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                                        active &&
                                            'bg-primary text-primary-foreground ring-4 ring-gold/40',
                                        done && 'bg-[#e3f3ec] text-[#0b6b4f]',
                                        !active &&
                                            !done &&
                                            'border-2 border-border text-muted-foreground',
                                    )}
                                >
                                    {done ? (
                                        <Check className="size-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                <span className="min-w-0">
                                    <span
                                        className={cn(
                                            'block text-sm',
                                            active
                                                ? 'font-bold'
                                                : 'font-semibold',
                                            !active &&
                                                !done &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        {item.title}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                        {item.hint}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <div className="flex flex-1 flex-wrap items-start gap-5">
                <section className="min-w-0 flex-[3_1_640px] rounded-2xl border bg-card p-5 md:p-6">
                    <div className="mb-5 space-y-1">
                        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Paso {step + 1} de {STEPS.length}
                        </p>
                        <h2 className="text-xl font-bold">
                            {STEPS[step].title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {STEPS[step].help}
                        </p>
                    </div>

                    {step === 0 && (
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
                    )}

                    {step === 1 && (
                        <ApplicantStep
                            applicant={applicant}
                            newTaxpayer={form.data.taxpayer}
                            documentTypes={documentTypes}
                            errors={errors}
                            onPick={(taxpayer) => {
                                setApplicant(taxpayer);
                                setPicked(null);
                                form.setData((data) => ({
                                    ...data,
                                    taxpayer_id: taxpayer.id,
                                    taxpayer: null,
                                    establishment_id: null,
                                    establishment: null,
                                    declaration: {
                                        ...data.declaration,
                                        ...representativeOf(taxpayer),
                                    },
                                }));
                            }}
                            onNew={(taxpayer) => {
                                setApplicant(null);
                                setPicked(null);
                                form.setData((data) => ({
                                    ...data,
                                    taxpayer_id: null,
                                    taxpayer,
                                    establishment_id: null,
                                    establishment: emptyEstablishment(),
                                    declaration: {
                                        ...data.declaration,
                                        ...representativeOf(null),
                                    },
                                }));
                            }}
                            onChangeNew={setTaxpayerField}
                            onClear={() => {
                                setApplicant(null);
                                setPicked(null);
                                form.setData((data) => ({
                                    ...data,
                                    taxpayer_id: null,
                                    taxpayer: null,
                                    establishment_id: null,
                                    establishment: null,
                                    declaration: {
                                        ...data.declaration,
                                        ...representativeOf(null),
                                    },
                                }));
                            }}
                            representative={form.data.declaration}
                            onChangeRepresentative={setDeclarationField}
                        />
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <EstablishmentStep
                                applicant={applicant}
                                establishmentId={form.data.establishment_id}
                                newEstablishment={form.data.establishment}
                                options={options}
                                errors={errors}
                                onPick={(establishment) => {
                                    const last =
                                        establishment.last_declaration ?? null;

                                    setPicked(establishment);
                                    setDeclarationSource(last);
                                    form.setData((data) => ({
                                        ...data,
                                        establishment_id: establishment.id,
                                        establishment: null,
                                        // Its last declaration to confirm; data from
                                        // another place's declaration is not kept.
                                        declaration: last
                                            ? keepRepresentative(
                                                  declarationFrom(
                                                      last.declaration,
                                                  ),
                                                  data.declaration,
                                              )
                                            : declarationSource
                                              ? keepRepresentative(
                                                    emptyDeclaration(),
                                                    data.declaration,
                                                )
                                              : data.declaration,
                                    }));
                                }}
                                onNew={() => {
                                    setPicked(null);
                                    setDeclarationSource(null);
                                    form.setData((data) => ({
                                        ...data,
                                        establishment_id: null,
                                        establishment:
                                            data.establishment ??
                                            emptyEstablishment(),
                                        declaration: declarationSource
                                            ? keepRepresentative(
                                                  emptyDeclaration(),
                                                  data.declaration,
                                              )
                                            : data.declaration,
                                    }));
                                }}
                                onChangeNew={setEstablishmentField}
                            />

                            {declarationSource &&
                                form.data.establishment_id !== null && (
                                    <div className="flex items-start gap-3 rounded-xl border border-[#c9d9f3] bg-[#e6eefb] p-4 text-sm dark:border-sky-400/30 dark:bg-sky-400/10">
                                        <History className="mt-0.5 size-5 shrink-0 text-[#1f4e96] dark:text-sky-300" />
                                        <div>
                                            <div className="font-semibold">
                                                Datos de la última declaración
                                                jurada: trámite{' '}
                                                {
                                                    declarationSource.procedure_code
                                                }{' '}
                                                del{' '}
                                                {formatDate(
                                                    declarationSource.date,
                                                )}
                                            </div>
                                            <p className="text-muted-foreground">
                                                Confirma con el solicitante que
                                                el local sigue tal cual. Si algo
                                                cambió, corrígelo abajo.
                                            </p>
                                        </div>
                                    </div>
                                )}

                            {(form.data.establishment_id !== null ||
                                form.data.establishment !== null) && (
                                <DeclarationFields
                                    declaration={form.data.declaration}
                                    errors={errors}
                                    onChange={setDeclarationField}
                                />
                            )}
                        </div>
                    )}
                </section>

                <aside
                    aria-label="Resumen del trámite"
                    className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-2xl border bg-card p-5 lg:sticky lg:top-4"
                >
                    <h2 className="text-lg font-bold">Resumen del trámite</h2>

                    <SummaryBlock label="Procedimientos">
                        {selectedTypes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aún no marcas ninguno.
                            </p>
                        ) : (
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
                        )}
                    </SummaryBlock>

                    <div className="rounded-xl bg-sidebar px-4 py-3 text-sidebar-foreground">
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold">Total</span>
                            <span className="font-display text-2xl font-bold text-white tabular-nums">
                                {currency.format(
                                    selectedTypes.reduce(
                                        (sum, type) =>
                                            sum + Number(type.fee ?? 0),
                                        0,
                                    ),
                                )}
                            </span>
                        </div>
                        <p className="mt-1 text-xs">
                            {currentUit
                                ? `Referencial con la UIT ${currentUit.year}. El monto se fija al emitir la orden de pago.`
                                : 'Falta registrar la UIT del año para calcular montos.'}
                        </p>
                    </div>

                    <SummaryBlock label="Solicitante">
                        {applicant ? (
                            <SummaryItem
                                icon={<UserRound />}
                                title={applicant.name}
                                detail={`${applicant.document_type.toUpperCase()} ${applicant.document_number}`}
                            />
                        ) : form.data.taxpayer ? (
                            <SummaryItem
                                icon={<UserRound />}
                                title={
                                    form.data.taxpayer.name ||
                                    'Nuevo contribuyente'
                                }
                                detail={`Nuevo · ${form.data.taxpayer.document_type.toUpperCase()} ${form.data.taxpayer.document_number}`}
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Se elige en el paso 2.
                            </p>
                        )}
                    </SummaryBlock>

                    <SummaryBlock label="Establecimiento">
                        {picked && form.data.establishment_id === picked.id ? (
                            <SummaryItem
                                icon={<Store />}
                                title={picked.trade_name ?? picked.activity}
                                detail={picked.full_address}
                                pin
                            />
                        ) : form.data.establishment ? (
                            <SummaryItem
                                icon={<Store />}
                                title={
                                    form.data.establishment.trade_name ||
                                    form.data.establishment.activity ||
                                    'Nuevo establecimiento'
                                }
                                detail="Nuevo establecimiento"
                            />
                        ) : form.data.establishment_id ? (
                            <SummaryItem
                                icon={<Store />}
                                title="Establecimiento registrado"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Se elige en el paso 3.
                            </p>
                        )}
                    </SummaryBlock>
                </aside>
            </div>

            {/* Floating action bar: stays inside the content area while scrolling. */}
            <footer className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
                <Button type="button" variant="ghost" asChild>
                    <Link href={cancelHref}>Cancelar</Link>
                </Button>

                <div className="flex items-center gap-2">
                    <span className="mr-2 hidden text-sm text-muted-foreground sm:inline">
                        Paso {step + 1} de {STEPS.length}
                    </span>
                    {step > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(step - 1)}
                        >
                            <ArrowLeft />
                            Anterior
                        </Button>
                    )}
                    {step < STEPS.length - 1 ? (
                        <Button
                            type="button"
                            onClick={next}
                            disabled={form.validating}
                        >
                            Siguiente
                            {form.validating ? <Spinner /> : <ArrowRight />}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={submit}
                            disabled={form.processing}
                            data-test="register-procedure-button"
                            className="bg-gold font-bold text-[#1a1d21] hover:bg-gold/90"
                        >
                            {form.processing ? <Spinner /> : <Check />}
                            {submitLabel}
                        </Button>
                    )}
                </div>
            </footer>
        </div>
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
    /** The detail is an address. */
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
