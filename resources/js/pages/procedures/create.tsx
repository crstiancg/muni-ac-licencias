import { Head } from '@inertiajs/react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import FormPage from '@/components/form-page';
import ProcedureFormFields from '@/components/procedure-form-fields';
import { create, index } from '@/routes/procedures';
import { show } from '@/routes/taxpayers';
import type { CurrentUit, ProcedureTypeOption, TaxpayerSummary } from '@/types';

export default function ProcedureCreate({
    taxpayer,
    procedureTypes,
    currentUit,
}: {
    taxpayer: TaxpayerSummary | null;
    procedureTypes: ProcedureTypeOption[];
    currentUit: CurrentUit;
}) {
    return (
        <>
            <Head title="Nuevo trámite" />

            <FormPage
                title="Nuevo trámite"
                description="Quién solicita, para qué establecimiento y qué procedimientos del TUPA."
                form={ProcedureController.store.form()}
                cancelHref={taxpayer ? show(taxpayer.id).url : index().url}
                submitLabel="Registrar trámite"
            >
                <ProcedureFormFields
                    taxpayer={taxpayer}
                    procedureTypes={procedureTypes}
                    currentUit={currentUit}
                />
            </FormPage>
        </>
    );
}

ProcedureCreate.layout = {
    breadcrumbs: [
        { title: 'Trámites', href: index() },
        { title: 'Nuevo', href: create() },
    ],
};
