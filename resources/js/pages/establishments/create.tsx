import { Head, useFormContext } from '@inertiajs/react';
import EstablishmentController from '@/actions/App/Http/Controllers/EstablishmentController';
import EstablishmentFormFields from '@/components/establishment-form-fields';
import FormPage from '@/components/form-page';
import InputError from '@/components/input-error';
import TaxpayerPicker from '@/components/taxpayer-picker';
import { Label } from '@/components/ui/label';
import { create, index } from '@/routes/establishments';
import { show } from '@/routes/taxpayers';
import type { EstablishmentOptions, TaxpayerSummary } from '@/types';

export default function EstablishmentCreate({
    taxpayer,
    options,
}: {
    taxpayer: TaxpayerSummary | null;
    options: EstablishmentOptions;
}) {
    return (
        <>
            <Head title="Registrar establecimiento" />

            <FormPage
                title="Registrar establecimiento"
                description={
                    taxpayer
                        ? `De ${taxpayer.name}`
                        : 'Elige al contribuyente que conduce el establecimiento.'
                }
                form={EstablishmentController.store.form()}
                cancelHref={taxpayer ? show(taxpayer.id).url : index().url}
            >
                <OwnerField taxpayer={taxpayer} />
                <EstablishmentFormFields options={options} />
            </FormPage>
        </>
    );
}

function OwnerField({ taxpayer }: { taxpayer: TaxpayerSummary | null }) {
    const form = useFormContext<{ taxpayer_id: number }>();

    return (
        <div className="grid gap-2">
            <Label>Contribuyente</Label>
            <TaxpayerPicker
                name="taxpayer_id"
                initial={taxpayer}
                invalid={!!form?.errors.taxpayer_id}
            />
            <InputError message={form?.errors.taxpayer_id} />
        </div>
    );
}

EstablishmentCreate.layout = {
    breadcrumbs: [
        { title: 'Establecimientos', href: index() },
        { title: 'Registrar', href: create() },
    ],
};
