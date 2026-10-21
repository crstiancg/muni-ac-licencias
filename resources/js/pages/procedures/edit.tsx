import { Head } from '@inertiajs/react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import FormPage from '@/components/form-page';
import ProcedureFormFields from '@/components/procedure-form-fields';
import { edit, index, show } from '@/routes/procedures';
import type {
    CurrentUit,
    Procedure,
    ProcedureTypeOption,
    TaxpayerSummary,
} from '@/types';

type Props = {
    procedure: Procedure & { taxpayer: TaxpayerSummary };
    procedureTypes: ProcedureTypeOption[];
    currentUit: CurrentUit;
};

export default function ProcedureEdit({
    procedure,
    procedureTypes,
    currentUit,
}: Props) {
    return (
        <>
            <Head title={`Editar trámite ${procedure.code}`} />

            <FormPage
                title={`Editar trámite ${procedure.code}`}
                description="Solo se puede editar antes de emitir la orden de pago."
                form={ProcedureController.update.form(procedure.id)}
                cancelHref={show(procedure.id).url}
                submitLabel="Guardar cambios"
            >
                <ProcedureFormFields
                    procedure={procedure}
                    taxpayer={procedure.taxpayer}
                    procedureTypes={procedureTypes}
                    currentUit={currentUit}
                />
            </FormPage>
        </>
    );
}

ProcedureEdit.layout = ({ procedure }: Props) => ({
    breadcrumbs: [
        { title: 'Trámites', href: index() },
        { title: procedure.code, href: show(procedure.id) },
        { title: 'Editar', href: edit(procedure.id) },
    ],
});
