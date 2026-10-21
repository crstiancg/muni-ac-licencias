import { Head, useFormContext } from '@inertiajs/react';
import { Store } from 'lucide-react';
import { useState } from 'react';
import ItseCertificateController from '@/actions/App/Http/Controllers/ItseCertificateController';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import FormPage from '@/components/form-page';
import FormSelect from '@/components/form-select';
import InputError from '@/components/input-error';
import TaxpayerPicker from '@/components/taxpayer-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { create, index } from '@/routes/itse';
import { show as showTaxpayer } from '@/routes/taxpayers';
import type { Establishment, RiskLevelOption, TaxpayerSummary } from '@/types';

type ItseFormData = {
    establishment_id: number;
    number: string;
    risk_level: string;
    inspected_at: string;
    issued_at: string;
    valid_until: string;
    inspector: string;
    notes: string;
};

type Props = {
    establishment: (Establishment & { taxpayer: TaxpayerSummary }) | null;
    riskLevels: RiskLevelOption[];
    validityYears: number;
};

export default function ItseCreate({
    establishment,
    riskLevels,
    validityYears,
}: Props) {
    return (
        <>
            <Head title="Registrar ITSE" />

            <FormPage
                title="Registrar certificado ITSE"
                description={`Vigencia de ${validityYears} años desde la emisión. Actualiza el nivel de riesgo del establecimiento.`}
                form={ItseCertificateController.store.form()}
                cancelHref={
                    establishment
                        ? showTaxpayer(establishment.taxpayer_id).url
                        : index().url
                }
            >
                <EstablishmentField establishment={establishment} />
                <CertificateFields
                    riskLevels={riskLevels}
                    defaultRisk={establishment?.risk_level ?? null}
                    validityYears={validityYears}
                />
            </FormPage>
        </>
    );
}

function EstablishmentField({
    establishment,
}: {
    establishment: Props['establishment'];
}) {
    const form = useFormContext<ItseFormData>();
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [selected, setSelected] = useState<number | null>(
        establishment?.id ?? null,
    );

    if (establishment) {
        return (
            <div className="flex gap-3 rounded-lg border p-4 text-sm">
                <input
                    type="hidden"
                    name="establishment_id"
                    value={establishment.id}
                />
                <Store className="mt-0.5 size-5 text-muted-foreground" />
                <div>
                    <div className="font-medium">
                        {establishment.taxpayer.name}
                    </div>
                    <div>{establishment.activity}</div>
                    <div className="text-muted-foreground">
                        {establishment.full_address}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">
                Establecimiento
            </legend>
            <input
                type="hidden"
                name="establishment_id"
                value={selected ?? ''}
            />
            <TaxpayerPicker
                name="taxpayer_lookup"
                onChange={(taxpayer: TaxpayerSummary | null) => {
                    setSelected(null);
                    setEstablishments([]);

                    if (taxpayer) {
                        fetch(
                            TaxpayerController.establishments.url(taxpayer.id),
                            {
                                headers: { Accept: 'application/json' },
                            },
                        )
                            .then((response) =>
                                response.ok ? response.json() : [],
                            )
                            .then((list: Establishment[]) => {
                                setEstablishments(list);
                                if (list.length === 1) {
                                    setSelected(list[0].id);
                                }
                            });
                    }
                }}
            />
            <div className="grid gap-2 md:grid-cols-2">
                {establishments.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelected(item.id)}
                        aria-pressed={selected === item.id}
                        className={cn(
                            'rounded-lg border p-3 text-left text-sm hover:bg-accent',
                            selected === item.id &&
                                'border-primary bg-accent ring-1 ring-primary',
                        )}
                    >
                        <div className="font-medium">{item.activity}</div>
                        <div className="text-muted-foreground">
                            {item.full_address}
                        </div>
                    </button>
                ))}
            </div>
            <InputError message={form?.errors.establishment_id} />
        </fieldset>
    );
}

function CertificateFields({
    riskLevels,
    defaultRisk,
    validityYears,
}: {
    riskLevels: RiskLevelOption[];
    defaultRisk: string | null;
    validityYears: number;
}) {
    const form = useFormContext<ItseFormData>();
    const today = new Date().toLocaleDateString('en-CA');
    const [risk, setRisk] = useState(defaultRisk ?? riskLevels[0]?.value);
    const [issuedAt, setIssuedAt] = useState(today);

    const selectedRisk = riskLevels.find((level) => level.value === risk);
    const defaultUntil = (() => {
        const date = new Date(`${issuedAt}T12:00:00`);
        date.setFullYear(date.getFullYear() + validityYears);
        date.setDate(date.getDate() - 1);

        return date.toLocaleDateString('es-PE');
    })();

    const text = (
        name: keyof ItseFormData,
        label: string,
        props: React.ComponentProps<typeof Input> = {},
    ) => (
        <div className="grid content-start gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
                id={name}
                name={name}
                onBlur={() => form?.validate(name)}
                aria-invalid={form?.errors[name] ? true : undefined}
                {...props}
            />
            <InputError message={form?.errors[name]} />
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                {text('number', 'N° de certificado', { autoFocus: true })}
                <div className="grid content-start gap-2">
                    <Label htmlFor="risk_level">Nivel de riesgo</Label>
                    <FormSelect
                        id="risk_level"
                        name="risk_level"
                        options={riskLevels}
                        defaultValue={risk}
                        onValueChange={setRisk}
                        invalid={!!form?.errors.risk_level}
                    />
                    <p className="text-xs text-muted-foreground">
                        {selectedRisk?.prior_itse
                            ? 'ITSE previa: requerida antes de otorgar la licencia.'
                            : 'ITSE posterior al otorgamiento de la licencia.'}
                    </p>
                    <InputError message={form?.errors.risk_level} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {text('inspected_at', 'Fecha de inspección', {
                    type: 'date',
                    max: today,
                })}
                {text('issued_at', 'Fecha de emisión', {
                    type: 'date',
                    max: today,
                    value: issuedAt,
                    onChange: (event) => setIssuedAt(event.target.value),
                })}
                <div className="grid content-start gap-2">
                    <Label htmlFor="valid_until">Vigente hasta</Label>
                    <Input
                        id="valid_until"
                        name="valid_until"
                        type="date"
                        onBlur={() => form?.validate('valid_until')}
                        aria-invalid={
                            form?.errors.valid_until ? true : undefined
                        }
                    />
                    <p className="text-xs text-muted-foreground">
                        Vacío = {defaultUntil} ({validityYears} años).
                    </p>
                    <InputError message={form?.errors.valid_until} />
                </div>
            </div>

            {text('inspector', 'Inspector (opcional)')}

            <div className="grid gap-2">
                <Label htmlFor="notes">Observaciones</Label>
                <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    onBlur={() => form?.validate('notes')}
                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                />
                <InputError message={form?.errors.notes} />
            </div>
        </div>
    );
}

ItseCreate.layout = {
    breadcrumbs: [
        { title: 'ITSE', href: index() },
        { title: 'Registrar', href: create() },
    ],
};
