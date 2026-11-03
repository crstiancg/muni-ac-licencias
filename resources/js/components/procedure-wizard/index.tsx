import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
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
    emptyEstablishment,
    representativeOf,
} from './types';
import type {
    Applicant,
    Declaration,
    NewEstablishment,
    NewTaxpayer,
    WizardData,
    WizardOptions,
} from './types';
import TypesStep from './types-step';

const STEPS = [
    { title: 'Tipos de trámite', hint: 'Qué solicita' },
    { title: 'Solicitante', hint: 'Quién lo solicita' },
    { title: 'Establecimiento', hint: 'Dónde y declaración jurada' },
];

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

    return (
        <div className="flex min-h-full flex-1 flex-col gap-6 p-4 md:p-6">
            <div className="-mx-4 -mt-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                <Heading title={title} description={description} />
            </div>

            <ol className="grid gap-3 md:grid-cols-3">
                {STEPS.map((item, index) => {
                    const done = index < step;
                    const active = index === step;

                    return (
                        <li key={item.title}>
                            <button
                                type="button"
                                disabled={!done}
                                onClick={() => setStep(index)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                                    active && 'border-primary bg-primary/5',
                                    done && 'hover:bg-accent',
                                    !done && !active && 'opacity-60',
                                )}
                            >
                                <span
                                    className={cn(
                                        'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                                        (active || done) &&
                                            'border-primary bg-primary text-primary-foreground',
                                    )}
                                >
                                    {done ? (
                                        <Check className="size-4" />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                <span>
                                    <span className="block text-sm font-medium">
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

            <section className="flex-1 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                <h2 className="mb-4 text-lg font-semibold">
                    {step + 1}. {STEPS[step].title}
                </h2>

                {step === 0 && (
                    <TypesStep
                        procedureTypes={procedureTypes}
                        selected={form.data.procedure_type_ids}
                        onChange={(ids) =>
                            form.setData('procedure_type_ids', ids)
                        }
                        currentUit={currentUit}
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
                            onPick={(establishment) =>
                                form.setData((data) => ({
                                    ...data,
                                    establishment_id: establishment.id,
                                    establishment: null,
                                }))
                            }
                            onNew={() =>
                                form.setData((data) => ({
                                    ...data,
                                    establishment_id: null,
                                    establishment:
                                        data.establishment ??
                                        emptyEstablishment(),
                                }))
                            }
                            onChangeNew={setEstablishmentField}
                        />

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

            {/* Floating action bar: stays inside the content area while scrolling. */}
            <footer className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
                <Button type="button" variant="outline" asChild>
                    <Link href={cancelHref}>Cancelar</Link>
                </Button>

                <div className="flex gap-2">
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
