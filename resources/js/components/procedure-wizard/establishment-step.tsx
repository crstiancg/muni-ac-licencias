import { Plus, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { Establishment } from '@/types';
import type { Applicant, NewEstablishment, WizardOptions } from './types';
import { WizardField, WizardInput } from './wizard-field';

/**
 * Step 3: where. Pick one of the applicant's establishments or register a
 * new one right here (always new for a new taxpayer).
 */
export default function EstablishmentStep({
    applicant,
    establishmentId,
    newEstablishment,
    options,
    errors,
    onPick,
    onNew,
    onChangeNew,
}: {
    applicant: Applicant | null;
    establishmentId: number | null;
    newEstablishment: NewEstablishment | null;
    options: WizardOptions;
    errors: Record<string, string | undefined>;
    onPick: (establishment: Establishment) => void;
    onNew: () => void;
    onChangeNew: (field: keyof NewEstablishment, value: string) => void;
}) {
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [loading, setLoading] = useState(applicant !== null);

    useEffect(() => {
        if (!applicant) {
            return;
        }

        fetch(TaxpayerController.establishments.url(applicant.id), {
            headers: { Accept: 'application/json' },
        })
            .then((response) => (response.ok ? response.json() : []))
            .then(setEstablishments)
            .finally(() => setLoading(false));
    }, [applicant]);

    if (loading) {
        return <Spinner />;
    }

    const field = (key: keyof NewEstablishment) => ({
        id: `establishment_${key}`,
        value: newEstablishment?.[key] ?? '',
        onChange: (value: string) => onChangeNew(key, value),
        error: errors[`establishment.${key}`],
    });

    const select = (
        key: 'economic_sector' | 'street_type' | 'settlement_type',
        label: string,
        choices: { value: string; label: string }[],
    ) => (
        <WizardField
            id={`establishment_${key}`}
            label={label}
            error={errors[`establishment.${key}`]}
        >
            <FormSelect
                id={`establishment_${key}`}
                name={`establishment_${key}`}
                options={choices}
                defaultValue={newEstablishment?.[key] || null}
                emptyLabel="—"
                onValueChange={(value) => onChangeNew(key, value)}
                invalid={!!errors[`establishment.${key}`]}
            />
        </WizardField>
    );

    return (
        <div className="space-y-6">
            {applicant && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {establishments.map((establishment) => (
                        <button
                            key={establishment.id}
                            type="button"
                            onClick={() => onPick(establishment)}
                            aria-pressed={establishmentId === establishment.id}
                            className={cn(
                                'flex gap-3 rounded-lg border p-4 text-left text-sm transition-colors hover:bg-accent',
                                establishmentId === establishment.id &&
                                    'border-primary bg-accent ring-1 ring-primary',
                            )}
                        >
                            <Store className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                            <span>
                                <span className="block font-medium">
                                    {establishment.trade_name ??
                                        establishment.activity}
                                </span>
                                {establishment.trade_name && (
                                    <span className="block">
                                        {establishment.activity}
                                    </span>
                                )}
                                <span className="block text-muted-foreground">
                                    {establishment.full_address}
                                </span>
                            </span>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={onNew}
                        aria-pressed={newEstablishment !== null}
                        className={cn(
                            'flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm font-medium transition-colors hover:bg-accent',
                            newEstablishment &&
                                'border-primary bg-accent ring-1 ring-primary',
                        )}
                    >
                        <Plus className="size-4" />
                        Nuevo establecimiento
                    </button>
                </div>
            )}

            <InputError
                message={errors.establishment ?? errors.establishment_id}
            />

            {newEstablishment && (
                <div className="space-y-6 rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-4">
                        <WizardInput
                            {...field('activity')}
                            label="Giro"
                            placeholder="BODEGA, RESTAURANTE…"
                            className="md:col-span-2"
                        />
                        <WizardInput
                            {...field('trade_name')}
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
                            {...field('settlement_name')}
                            label="Urb., AA.HH., barrio"
                            placeholder="CERCADO"
                            className="md:col-span-2"
                        />
                        {select(
                            'street_type',
                            'Tipo de vía',
                            options.streetTypes,
                        )}
                        <WizardInput
                            {...field('street')}
                            label="Nombre de la vía"
                            placeholder="TACNA"
                            className="md:col-span-2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                        <WizardInput {...field('number')} label="N°" />
                        <WizardInput {...field('interior')} label="Int." />
                        <WizardInput {...field('block')} label="Mz." />
                        <WizardInput {...field('lot')} label="Lt." />
                        <WizardInput
                            {...field('area')}
                            label="Área (m²)"
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                        />
                        <WizardInput
                            {...field('capacity')}
                            label="Aforo"
                            type="number"
                            inputMode="numeric"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
