import type { ReactNode } from 'react';
import FormSelect from '@/components/form-select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Declaration } from './types';
import { WizardField, WizardInput } from './wizard-field';

const MATERIALS = [
    { value: 'noble', label: 'Noble' },
    { value: 'rustico', label: 'Rústico' },
    { value: 'mixto', label: 'Mixto' },
];

type Flag =
    | 'flammable_materials'
    | 'signage'
    | 'breakers'
    | 'first_aid_kit'
    | 'wiring_conduits'
    | 'sign'
    | 'sign_luminous';

/**
 * Step 3, below the establishment: the sworn declaration (DJ) sections of
 * the printed form, in the same order as the old system (5. otros datos,
 * 6. sectorial, 7. ITSE, 8. anuncio).
 */
export default function DeclarationFields({
    declaration,
    errors,
    onChange,
}: {
    declaration: Declaration;
    errors: Record<string, string | undefined>;
    onChange: <K extends keyof Declaration>(
        field: K,
        value: Declaration[K],
    ) => void;
}) {
    const text = (key: keyof Declaration) => ({
        id: `declaration_${key}`,
        value: (declaration[key] ?? '') as string,
        onChange: (value: string) => onChange(key, value as never),
        error: errors[`declaration.${key}`],
    });

    const number = (key: keyof Declaration) => ({
        ...text(key),
        type: 'number',
        inputMode: 'decimal' as const,
        step: '0.01',
        min: '0',
    });

    const yesNo = (key: Flag, label: string) => (
        <WizardField
            id={`declaration_${key}`}
            label={label}
            error={errors[`declaration.${key}`]}
        >
            <ToggleGroup
                id={`declaration_${key}`}
                type="single"
                variant="outline"
                value={
                    declaration[key] === null
                        ? ''
                        : declaration[key]
                          ? 'si'
                          : 'no'
                }
                onValueChange={(value) =>
                    value && onChange(key, value === 'si')
                }
                className="justify-start"
            >
                <ToggleGroupItem value="si" className="px-4">
                    Sí
                </ToggleGroupItem>
                <ToggleGroupItem value="no" className="px-4">
                    No
                </ToggleGroupItem>
            </ToggleGroup>
        </WizardField>
    );

    const area =
        Number(declaration.length) > 0 && Number(declaration.width) > 0
            ? (Number(declaration.length) * Number(declaration.width)).toFixed(
                  2,
              )
            : null;

    return (
        <div className="space-y-6">
            <Section title="Dimensiones y otros datos del establecimiento">
                <div className="grid gap-4 md:grid-cols-4">
                    <WizardInput {...number('length')} label="Largo (m)" />
                    <WizardInput {...number('width')} label="Ancho (m)" />
                    <WizardField
                        id="declaration_construction_material"
                        label="Material de construcción predominante"
                        error={errors['declaration.construction_material']}
                    >
                        <FormSelect
                            id="declaration_construction_material"
                            name="declaration_construction_material"
                            options={MATERIALS}
                            defaultValue={
                                declaration.construction_material || null
                            }
                            emptyLabel="—"
                            onValueChange={(value) =>
                                onChange('construction_material', value)
                            }
                        />
                    </WizardField>
                    {yesNo(
                        'flammable_materials',
                        'Materiales combustibles, tóxicos o inflamables',
                    )}
                </div>
                {area && (
                    <p className="text-sm text-muted-foreground">
                        Largo × ancho = {area} m²
                    </p>
                )}
            </Section>

            <Section title="Declaración jurada sectorial">
                <WizardInput
                    {...text('zoning')}
                    label="El establecimiento es clasificado como uso compatible"
                />
            </Section>

            <Section title="ITSE: medidas y equipo básico de seguridad">
                <div className="grid gap-4 md:grid-cols-6">
                    <WizardInput
                        {...number('extinguisher_pqs_kg')}
                        label="Extintor PQS (kg)"
                        placeholder="0.00"
                    />
                    <WizardInput
                        {...number('extinguisher_co2_kg')}
                        label="Extintor CO2 (kg)"
                        placeholder="0.00"
                    />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    {yesNo('signage', 'Señalización')}
                    {yesNo('breakers', 'Llaves termomagnéticas')}
                    {yesNo('first_aid_kit', 'Botiquín implementado')}
                    {yesNo('wiring_conduits', 'Cables entubados o empotrados')}
                </div>
            </Section>

            <Section title="Anuncio adosado a fachada">
                <div className="grid gap-4 md:grid-cols-4">
                    {yesNo('sign', '¿Tiene anuncio?')}
                    {declaration.sign && yesNo('sign_luminous', 'Luminoso')}
                </div>
                {declaration.sign && (
                    <>
                        <div className="grid gap-4 md:grid-cols-4">
                            <WizardInput
                                {...text('sign_features')}
                                label="Características"
                            />
                            <WizardInput
                                {...text('sign_material')}
                                label="Material"
                            />
                            <WizardInput
                                {...number('sign_length')}
                                label="Largo (m)"
                            />
                            <WizardInput
                                {...number('sign_height')}
                                label="Alto (m)"
                            />
                        </div>
                        <WizardInput
                            {...text('sign_description')}
                            label="Estructura, materiales, características, color"
                        />
                    </>
                )}
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="space-y-4 rounded-lg border p-4">
            <legend className="px-1 text-sm font-semibold">{title}</legend>
            {children}
        </fieldset>
    );
}
