import { useFormContext } from '@inertiajs/react';
import { useState } from 'react';
import AreaInput from '@/components/area-input';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Establishment, EstablishmentOptions } from '@/types';

type EstablishmentFormData = Omit<
    Establishment,
    'id' | 'full_address' | 'taxpayer' | 'created_at' | 'updated_at'
>;

type TextField = keyof Pick<
    EstablishmentFormData,
    | 'trade_name'
    | 'activity'
    | 'street'
    | 'number'
    | 'interior'
    | 'block'
    | 'lot'
    | 'settlement_name'
>;

/**
 * Establishment fields grouped in sections (activity, address, premises).
 * Must be rendered inside an Inertia <Form noValidate> (Precognition).
 */
export default function EstablishmentFormFields({
    establishment,
    options,
}: {
    establishment?: Establishment;
    options: EstablishmentOptions;
}) {
    const form = useFormContext<EstablishmentFormData>();
    const [area, setArea] = useState(establishment?.area ?? '');

    const text = (
        field: TextField,
        label: string,
        extra: React.ComponentProps<typeof Input> = {},
    ) => (
        <div className="grid gap-2">
            <Label htmlFor={field}>{label}</Label>
            <Input
                id={field}
                name={field}
                defaultValue={establishment?.[field] ?? ''}
                onBlur={() => form?.validate(field)}
                aria-invalid={form?.errors[field] ? true : undefined}
                {...extra}
            />
            <InputError message={form?.errors[field]} />
        </div>
    );

    return (
        <>
            <Section title="Actividad">
                <div className="grid gap-4 sm:grid-cols-2">
                    {text('activity', 'Giro', {
                        placeholder: 'BODEGA, RESTAURANTE…',
                    })}
                    {text('trade_name', 'Nombre comercial (opcional)')}
                </div>

                <div className="grid gap-2 sm:max-w-xs">
                    <Label htmlFor="economic_sector">Sector económico</Label>
                    <FormSelect
                        id="economic_sector"
                        name="economic_sector"
                        options={options.economicSectors}
                        defaultValue={establishment?.economic_sector}
                        emptyLabel="Sin especificar"
                        invalid={!!form?.errors.economic_sector}
                    />
                    <InputError message={form?.errors.economic_sector} />
                </div>
            </Section>

            <Section title="Dirección">
                <div className="grid gap-4 sm:grid-cols-[12rem_1fr_8rem]">
                    <div className="grid gap-2">
                        <Label htmlFor="street_type">Tipo de vía</Label>
                        <FormSelect
                            id="street_type"
                            name="street_type"
                            options={options.streetTypes}
                            defaultValue={establishment?.street_type}
                            emptyLabel="—"
                            invalid={!!form?.errors.street_type}
                        />
                        <InputError message={form?.errors.street_type} />
                    </div>
                    {text('street', 'Vía', { placeholder: 'TACNA' })}
                    {text('number', 'Número')}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {text('interior', 'Interior')}
                    {text('block', 'Manzana')}
                    {text('lot', 'Lote')}
                </div>

                <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
                    <div className="grid gap-2">
                        <Label htmlFor="settlement_type">
                            Tipo de habilitación
                        </Label>
                        <FormSelect
                            id="settlement_type"
                            name="settlement_type"
                            options={options.settlementTypes}
                            defaultValue={establishment?.settlement_type}
                            emptyLabel="—"
                            invalid={!!form?.errors.settlement_type}
                        />
                        <InputError message={form?.errors.settlement_type} />
                    </div>
                    {text('settlement_name', 'Nombre de la habilitación', {
                        placeholder: 'CERCADO, LAYKAKOTA…',
                    })}
                </div>
            </Section>

            <Section title="Local">
                <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                    <AreaInput
                        id="area"
                        name="area"
                        value={area}
                        onChange={setArea}
                        onBlur={() => form?.validate('area')}
                        error={form?.errors.area}
                    />

                    <div className="grid gap-2">
                        <Label htmlFor="capacity">Aforo (personas)</Label>
                        <Input
                            id="capacity"
                            type="number"
                            name="capacity"
                            inputMode="numeric"
                            defaultValue={establishment?.capacity ?? ''}
                            onBlur={() => form?.validate('capacity')}
                            aria-invalid={
                                form?.errors.capacity ? true : undefined
                            }
                        />
                        <InputError message={form?.errors.capacity} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="risk_level">Nivel de riesgo</Label>
                        <FormSelect
                            id="risk_level"
                            name="risk_level"
                            options={options.riskLevels}
                            defaultValue={establishment?.risk_level}
                            emptyLabel="Sin ITSE aún"
                            invalid={!!form?.errors.risk_level}
                        />
                        <InputError message={form?.errors.risk_level} />
                    </div>
                </div>

                {establishment?.legacy_itse_type && (
                    <p className="text-xs text-muted-foreground">
                        ITSE en el sistema anterior:{' '}
                        {establishment.legacy_itse_type}
                    </p>
                )}
            </Section>
        </>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold">{title}</legend>
            {children}
        </fieldset>
    );
}
