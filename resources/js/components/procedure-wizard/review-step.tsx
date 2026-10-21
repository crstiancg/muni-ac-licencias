import type { CurrentUit, ProcedureTypeOption } from '@/types';
import { formatFee } from './types-step';
import type { WizardData } from './types';
import { WizardField, WizardInput } from './wizard-field';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

/**
 * Step 4: mesa de partes data and a summary of everything before registering.
 */
export default function ReviewStep({
    data,
    applicantLabel,
    establishmentLabel,
    procedureTypes,
    currentUit,
    errors,
    onChange,
}: {
    data: WizardData;
    applicantLabel: string;
    establishmentLabel: string;
    procedureTypes: ProcedureTypeOption[];
    currentUit: CurrentUit;
    errors: Record<string, string | undefined>;
    onChange: (
        field: 'file_number' | 'folios' | 'notes',
        value: string,
    ) => void;
}) {
    const selected = procedureTypes.filter((type) =>
        data.procedure_type_ids.includes(type.id),
    );
    const total = selected.reduce(
        (sum, type) => sum + Number(type.fee ?? 0),
        0,
    );

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <WizardInput
                        id="file_number"
                        label="N° de expediente"
                        value={data.file_number}
                        onChange={(value) => onChange('file_number', value)}
                        error={errors.file_number}
                        autoFocus
                    />
                    <WizardInput
                        id="folios"
                        label="Folios"
                        type="number"
                        inputMode="numeric"
                        value={data.folios}
                        onChange={(value) => onChange('folios', value)}
                        error={errors.folios}
                    />
                </div>
                <WizardField
                    id="notes"
                    label="Observaciones"
                    error={errors.notes}
                >
                    <textarea
                        id="notes"
                        rows={5}
                        value={data.notes}
                        onChange={(event) =>
                            onChange('notes', event.target.value)
                        }
                        aria-invalid={errors.notes ? true : undefined}
                        className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
                    />
                </WizardField>
            </div>

            <dl className="space-y-4 rounded-lg border p-4 text-sm">
                <div>
                    <dt className="text-xs text-muted-foreground">
                        Solicitante
                    </dt>
                    <dd className="font-medium">{applicantLabel}</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">
                        Establecimiento
                    </dt>
                    <dd>{establishmentLabel}</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">
                        Procedimientos
                    </dt>
                    <dd>
                        <ul className="mt-1 space-y-1">
                            {selected.map((type) => (
                                <li
                                    key={type.id}
                                    className="flex justify-between gap-3"
                                >
                                    <span>{type.name}</span>
                                    <span className="whitespace-nowrap tabular-nums">
                                        {formatFee(type.fee)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </dd>
                </div>
                <div className="flex justify-between border-t pt-3 font-semibold tabular-nums">
                    <span>Total referencial</span>
                    <span>{currency.format(total)}</span>
                </div>
                {!currentUit && (
                    <p className="text-xs text-amber-600">
                        Falta registrar la UIT del año.
                    </p>
                )}
            </dl>
        </div>
    );
}
