import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type {
    CurrentUit,
    DocumentTypeOption,
    ProcedureTypeOption,
} from '@/types';
import ApplicantStep from './applicant-step';
import EstablishmentStep from './establishment-step';
import ReviewStep from './review-step';
import {
    ESTABLISHMENT_FIELDS,
    TAXPAYER_FIELDS,
    emptyEstablishment,
} from './types';
import type {
    Applicant,
    NewEstablishment,
    NewTaxpayer,
    WizardData,
    WizardOptions,
} from './types';
import TypesStep from './types-step';

const STEPS = [
    { title: 'Tipos de trámite', hint: 'Qué solicita' },
    { title: 'Solicitante', hint: 'Quién lo solicita' },
    { title: 'Establecimiento', hint: 'Dónde' },
    { title: 'Mesa de partes', hint: 'Expediente y resumen' },
];

/** Step an error key belongs to, to jump there when the server rejects. */
const stepOf = (key: string) =>
    key.startsWith('procedure_type_ids')
        ? 0
        : key.startsWith('taxpayer')
          ? 1
          : key.startsWith('establishment')
            ? 2
            : 3;

/**
 * Register or edit a procedure step by step, in the order clerks know from
 * the old system (types first). Each "Siguiente" validates its step on the
 * server (Precognition) and new taxpayers/establishments are created with
 * the procedure, so the clerk never leaves this screen.
 */
export default function ProcedureWizard({
    title,
    description,
    action,
    initial,
    initialApplicant,
    initialEstablishmentLabel,
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
    initialEstablishmentLabel?: string;
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
    const [establishmentLabel, setEstablishmentLabel] = useState(
        initialEstablishmentLabel ?? '',
    );
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
                return form.data.taxpayer_id
                    ? ['taxpayer_id']
                    : [
                          'taxpayer',
                          ...TAXPAYER_FIELDS.map((key) => `taxpayer.${key}`),
                      ];
            case 2:
                return form.data.establishment_id
                    ? ['establishment_id']
                    : [
                          'establishment',
                          ...ESTABLISHMENT_FIELDS.map(
                              (key) => `establishment.${key}`,
                          ),
                      ];
            default:
                return ['file_number', 'folios', 'notes'];
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
                const first = Object.keys(serverErrors).map(stepOf).sort()[0];
                setStep(first ?? 3);
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

    const setEstablishmentField = (
        field: keyof NewEstablishment,
        value: string,
    ) =>
        form.setData((data) => ({
            ...data,
            establishment: data.establishment
                ? { ...data.establishment, [field]: value }
                : null,
        }));

    const applicantLabel = applicant
        ? `${applicant.name} (${applicant.document_type.toUpperCase()} ${applicant.document_number})`
        : form.data.taxpayer
          ? `${form.data.taxpayer.name || '(sin nombre)'} (${form.data.taxpayer.document_type.toUpperCase()} ${form.data.taxpayer.document_number}) · nuevo`
          : '—';

    const newEstablishmentLabel = form.data.establishment
        ? `${form.data.establishment.activity || '(sin giro)'} · ${[form.data.establishment.street_type, form.data.establishment.street, form.data.establishment.number && `N° ${form.data.establishment.number}`].filter(Boolean).join(' ')} · nuevo`
        : establishmentLabel || '—';

    return (
        <div className="flex min-h-full flex-1 flex-col gap-6 p-4">
            <Heading title={title} description={description} />

            <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
                            setEstablishmentLabel('');
                            form.setData((data) => ({
                                ...data,
                                taxpayer_id: taxpayer.id,
                                taxpayer: null,
                                establishment_id: null,
                                establishment: null,
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
                            }));
                        }}
                    />
                )}

                {step === 2 && (
                    <EstablishmentStep
                        applicant={applicant}
                        establishmentId={form.data.establishment_id}
                        newEstablishment={form.data.establishment}
                        options={options}
                        errors={errors}
                        onPick={(establishment) => {
                            setEstablishmentLabel(
                                `${establishment.activity} · ${establishment.full_address}`,
                            );
                            form.setData((data) => ({
                                ...data,
                                establishment_id: establishment.id,
                                establishment: null,
                            }));
                        }}
                        onNew={() =>
                            form.setData((data) => ({
                                ...data,
                                establishment_id: null,
                                establishment:
                                    data.establishment ?? emptyEstablishment(),
                            }))
                        }
                        onChangeNew={setEstablishmentField}
                    />
                )}

                {step === 3 && (
                    <ReviewStep
                        data={form.data}
                        applicantLabel={applicantLabel}
                        establishmentLabel={newEstablishmentLabel}
                        procedureTypes={procedureTypes}
                        currentUit={currentUit}
                        errors={errors}
                        onChange={(field, value) => form.setData(field, value)}
                    />
                )}
            </section>

            <footer className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur">
                <Button type="button" variant="ghost" asChild>
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
