import { Head, useFormContext } from '@inertiajs/react';
import { useState } from 'react';
import MarketStallController from '@/actions/App/Http/Controllers/MarketStallController';
import FormPage from '@/components/form-page';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import InputError from '@/components/input-error';
import TaxpayerPicker from '@/components/taxpayer-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { show as showStall } from '@/routes/market-stalls';
import { index, show as showMarket } from '@/routes/markets';
import type { TaxpayerSummary } from '@/types';

type Stall = {
    id: number;
    market_id: number;
    code: string;
    stall_type: string | null;
    activity: string | null;
    fee: string | null;
    taxpayer_id: number | null;
    taxpayer: TaxpayerSummary | null;
    holder_name: string | null;
    holder_document: string | null;
    status: string;
    notes: string | null;
};

type StallFormData = Omit<Stall, 'id' | 'taxpayer'>;

type Props = {
    stall: Stall | null;
    marketId: number | null;
    markets: SelectOption[];
    types: SelectOption[];
    statuses: SelectOption[];
};

export default function StallForm({
    stall,
    marketId,
    markets,
    types,
    statuses,
}: Props) {
    return (
        <>
            <Head
                title={stall ? `Editar puesto ${stall.code}` : 'Nuevo puesto'}
            />

            <FormPage
                title={stall ? `Editar puesto ${stall.code}` : 'Nuevo puesto'}
                description="El titular puede ser un contribuyente registrado o solo un nombre (datos del sistema anterior)."
                form={
                    stall
                        ? MarketStallController.update.form(stall.id)
                        : MarketStallController.store.form()
                }
                cancelHref={
                    stall
                        ? showStall(stall.id).url
                        : marketId
                          ? showMarket(marketId).url
                          : index().url
                }
                submitLabel={stall ? 'Guardar cambios' : 'Guardar'}
            >
                <Fields
                    stall={stall}
                    marketId={marketId}
                    markets={markets}
                    types={types}
                    statuses={statuses}
                />
            </FormPage>
        </>
    );
}

function Fields({ stall, marketId, markets, types, statuses }: Props) {
    const form = useFormContext<StallFormData>();
    const [hasTaxpayer, setHasTaxpayer] = useState(!!stall?.taxpayer_id);

    const text = (
        name: keyof StallFormData,
        label: string,
        props: React.ComponentProps<typeof Input> = {},
    ) => (
        <div className="grid content-start gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
                id={name}
                name={name}
                defaultValue={(stall?.[name] as string | null) ?? ''}
                onBlur={() => form?.validate(name)}
                aria-invalid={form?.errors[name] ? true : undefined}
                {...props}
            />
            <InputError message={form?.errors[name]} />
        </div>
    );

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid content-start gap-2">
                    <Label htmlFor="market_id">Mercado</Label>
                    <FormSelect
                        id="market_id"
                        name="market_id"
                        options={markets}
                        defaultValue={String(
                            stall?.market_id ?? marketId ?? markets[0]?.value,
                        )}
                        invalid={!!form?.errors.market_id}
                    />
                    <InputError message={form?.errors.market_id} />
                </div>
                {text('code', 'N° de puesto', { placeholder: 'C-01' })}
                <div className="grid content-start gap-2">
                    <Label htmlFor="stall_type">Tipo</Label>
                    <FormSelect
                        id="stall_type"
                        name="stall_type"
                        options={types}
                        defaultValue={stall?.stall_type}
                        emptyLabel="—"
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {text('activity', 'Giro', { placeholder: 'CARNES, VIANDAS…' })}
                {text('fee', 'Cuota por período (S/)', {
                    type: 'number',
                    step: '0.01',
                    inputMode: 'decimal',
                })}
                <div className="grid content-start gap-2">
                    <Label htmlFor="status">Estado</Label>
                    <FormSelect
                        id="status"
                        name="status"
                        options={statuses}
                        defaultValue={stall?.status ?? 'activo'}
                    />
                </div>
            </div>

            <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-semibold">Titular</legend>
                <TaxpayerPicker
                    name="taxpayer_id"
                    initial={stall?.taxpayer ?? null}
                    onChange={(taxpayer) => setHasTaxpayer(!!taxpayer)}
                />
                {!hasTaxpayer && (
                    <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
                        {text(
                            'holder_name',
                            'O nombre del titular (sin registrar)',
                        )}
                        {text('holder_document', 'DNI / RUC')}
                    </div>
                )}
            </fieldset>

            {text('notes', 'Observaciones')}
        </>
    );
}

StallForm.layout = ({ stall }: Props) => ({
    breadcrumbs: [
        { title: 'Mercados', href: index() },
        {
            title: stall ? `Puesto ${stall.code}` : 'Nuevo puesto',
            href: index(),
        },
    ],
});
