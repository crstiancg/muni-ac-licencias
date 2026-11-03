import { useFormContext } from '@inertiajs/react';
import { useState } from 'react';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ProcedureType, RiskLevelOption } from '@/types';

type ProcedureTypeFormData = Pick<
    ProcedureType,
    | 'tupa_code'
    | 'name'
    | 'description'
    | 'uit_percentage'
    | 'fixed_amount'
    | 'risk_level'
    | 'document_type'
    | 'validity_months'
    | 'license_effect'
    | 'processing_days'
    | 'legal_basis'
    | 'position'
    | 'is_active'
>;

const NO_RISK = 'none';

const textareaClassName =
    'flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40';

/**
 * Procedure type fields, validated live against the server rules
 * (Precognition). Must be rendered inside an Inertia <Form noValidate>.
 *
 * Radix Select and Checkbox don't submit values Laravel understands (an empty
 * option is not allowed, an unchecked box sends nothing and a checked one
 * sends "on"), so both mirror their state into hidden inputs.
 */
export default function ProcedureTypeFormFields({
    procedureType,
    riskLevels,
    documentTypes,
    licenseEffects,
    uitAmount,
}: {
    procedureType?: ProcedureType;
    riskLevels: RiskLevelOption[];
    documentTypes: SelectOption[];
    licenseEffects: SelectOption[];
    uitAmount: string | null;
}) {
    const form = useFormContext<ProcedureTypeFormData>();
    const [riskLevel, setRiskLevel] = useState<string>(
        procedureType?.risk_level ?? NO_RISK,
    );
    const [isActive, setIsActive] = useState(procedureType?.is_active ?? true);
    const [percentage, setPercentage] = useState(
        procedureType?.uit_percentage ?? '',
    );
    // Some TUPA fees are a fixed amount; the rest follow the UIT of the year.
    const [feeMode, setFeeMode] = useState<'uit' | 'fijo'>(
        procedureType?.fixed_amount != null ? 'fijo' : 'uit',
    );

    const selectedRisk = riskLevels.find((level) => level.value === riskLevel);
    const fee =
        uitAmount !== null && percentage !== '' && !isNaN(Number(percentage))
            ? (Number(percentage) * Number(uitAmount)) / 100
            : null;

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <div className="grid gap-2">
                    <Label htmlFor="tupa_code">Código TUPA</Label>
                    <Input
                        id="tupa_code"
                        name="tupa_code"
                        defaultValue={procedureType?.tupa_code ?? ''}
                        onBlur={() => form?.validate('tupa_code')}
                        aria-invalid={form?.errors.tupa_code ? true : undefined}
                        placeholder="PA-01"
                    />
                    <InputError message={form?.errors.tupa_code} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={procedureType?.name}
                        onBlur={() => form?.validate('name')}
                        aria-invalid={form?.errors.name ? true : undefined}
                        placeholder="LICENCIA DE FUNCIONAMIENTO…"
                        autoFocus
                    />
                    <InputError message={form?.errors.name} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <textarea
                    id="description"
                    name="description"
                    rows={2}
                    defaultValue={procedureType?.description ?? ''}
                    onBlur={() => form?.validate('description')}
                    aria-invalid={form?.errors.description ? true : undefined}
                    className={textareaClassName}
                />
                <InputError message={form?.errors.description} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid content-start gap-2">
                    <Label htmlFor="fee_mode">Derecho de trámite</Label>
                    <ToggleGroup
                        id="fee_mode"
                        type="single"
                        variant="outline"
                        value={feeMode}
                        onValueChange={(value) =>
                            value && setFeeMode(value as 'uit' | 'fijo')
                        }
                        className="justify-start"
                    >
                        <ToggleGroupItem value="uit" className="px-3">
                            % de la UIT
                        </ToggleGroupItem>
                        <ToggleGroupItem value="fijo" className="px-3">
                            Monto fijo
                        </ToggleGroupItem>
                    </ToggleGroup>

                    {feeMode === 'uit' ? (
                        <>
                            {/* Clears a previous fixed amount on update. */}
                            <input type="hidden" name="fixed_amount" value="" />
                            <Input
                                id="uit_percentage"
                                type="number"
                                name="uit_percentage"
                                inputMode="decimal"
                                step="0.0001"
                                value={percentage}
                                onChange={(event) =>
                                    setPercentage(event.target.value)
                                }
                                onBlur={() => form?.validate('uit_percentage')}
                                aria-invalid={
                                    form?.errors.uit_percentage
                                        ? true
                                        : undefined
                                }
                                aria-label="% de la UIT"
                                placeholder="4.5196"
                            />
                            <p className="text-xs text-muted-foreground">
                                {uitAmount === null
                                    ? 'Registra la UIT del año para ver el monto.'
                                    : fee === null
                                      ? `UIT vigente: S/ ${uitAmount}`
                                      : `Monto: S/ ${fee.toFixed(2)} (UIT S/ ${uitAmount}). Cambia cada año con la UIT.`}
                            </p>
                            <InputError message={form?.errors.uit_percentage} />
                        </>
                    ) : (
                        <>
                            <Input
                                id="fixed_amount"
                                type="number"
                                name="fixed_amount"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                defaultValue={procedureType?.fixed_amount ?? ''}
                                onBlur={() => form?.validate('fixed_amount')}
                                aria-invalid={
                                    form?.errors.fixed_amount ? true : undefined
                                }
                                aria-label="Monto fijo en soles"
                                placeholder="208.20"
                            />
                            <p className="text-xs text-muted-foreground">
                                Monto en soles. No cambia con la UIT.
                            </p>
                            <InputError
                                message={
                                    form?.errors.fixed_amount ??
                                    form?.errors.uit_percentage
                                }
                            />
                        </>
                    )}
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="risk_level">Nivel de riesgo</Label>
                    <input
                        type="hidden"
                        name="risk_level"
                        value={riskLevel === NO_RISK ? '' : riskLevel}
                    />
                    <Select
                        value={riskLevel}
                        onValueChange={(value) => {
                            setRiskLevel(value);
                            // Let the hidden input re-render before validating.
                            setTimeout(() => form?.validate('risk_level'));
                        }}
                    >
                        <SelectTrigger
                            id="risk_level"
                            className="w-full"
                            aria-invalid={
                                form?.errors.risk_level ? true : undefined
                            }
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NO_RISK}>No aplica</SelectItem>
                            {riskLevels.map((level) => (
                                <SelectItem
                                    key={level.value}
                                    value={level.value}
                                >
                                    {level.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        {selectedRisk
                            ? selectedRisk.prior_itse
                                ? 'ITSE previa al otorgamiento.'
                                : 'ITSE posterior al otorgamiento.'
                            : 'Para trámites que no son licencias.'}
                    </p>
                    <InputError message={form?.errors.risk_level} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="document_type">Documento que emite</Label>
                <FormSelect
                    id="document_type"
                    name="document_type"
                    options={documentTypes}
                    defaultValue={procedureType?.document_type}
                    emptyLabel="Ninguno (cese, otros)"
                    invalid={!!form?.errors.document_type}
                />
                <InputError message={form?.errors.document_type} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="validity_months">
                    Vigencia del documento (meses)
                </Label>
                <Input
                    id="validity_months"
                    type="number"
                    name="validity_months"
                    inputMode="numeric"
                    defaultValue={procedureType?.validity_months ?? ''}
                    onBlur={() => form?.validate('validity_months')}
                    aria-invalid={
                        form?.errors.validity_months ? true : undefined
                    }
                    placeholder="Indeterminada"
                />
                <p className="text-xs text-muted-foreground">
                    Vacío = indeterminada (Ley 28976). Ej.: 12 para la licencia
                    provisional de bodegas (Ley 30877).
                </p>
                <InputError message={form?.errors.validity_months} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="license_effect">
                    Efecto sobre una licencia existente
                </Label>
                <FormSelect
                    id="license_effect"
                    name="license_effect"
                    options={licenseEffects}
                    defaultValue={procedureType?.license_effect}
                    emptyLabel="Ninguno"
                    invalid={!!form?.errors.license_effect}
                />
                <p className="text-xs text-muted-foreground">
                    Transferencia o cambio de giro reemplazan la licencia
                    anterior; cese la cierra; duplicado emite una nueva (marcada
                    como DUPLICADO) y da de baja la anterior.
                </p>
                <InputError message={form?.errors.license_effect} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="processing_days">
                        Plazo (días hábiles, opcional)
                    </Label>
                    <Input
                        id="processing_days"
                        type="number"
                        name="processing_days"
                        inputMode="numeric"
                        defaultValue={procedureType?.processing_days ?? ''}
                        onBlur={() => form?.validate('processing_days')}
                        aria-invalid={
                            form?.errors.processing_days ? true : undefined
                        }
                    />
                    <InputError message={form?.errors.processing_days} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="position">Orden</Label>
                    <Input
                        id="position"
                        type="number"
                        name="position"
                        inputMode="numeric"
                        defaultValue={procedureType?.position ?? ''}
                        onBlur={() => form?.validate('position')}
                        aria-invalid={form?.errors.position ? true : undefined}
                        placeholder="Al final"
                    />
                    <InputError message={form?.errors.position} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="legal_basis">Base legal (opcional)</Label>
                <Input
                    id="legal_basis"
                    name="legal_basis"
                    defaultValue={procedureType?.legal_basis ?? ''}
                    onBlur={() => form?.validate('legal_basis')}
                    aria-invalid={form?.errors.legal_basis ? true : undefined}
                    placeholder="Ordenanza Municipal N° …"
                />
                <InputError message={form?.errors.legal_basis} />
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="hidden"
                    name="is_active"
                    value={isActive ? '1' : '0'}
                />
                <Checkbox
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="is_active">
                    Activo (se ofrece en nuevos trámites)
                </Label>
                <InputError message={form?.errors.is_active} />
            </div>
        </>
    );
}
