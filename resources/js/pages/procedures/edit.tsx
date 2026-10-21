import { Head } from '@inertiajs/react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import ProcedureWizard from '@/components/procedure-wizard';
import type {
    Applicant,
    WizardOptions,
} from '@/components/procedure-wizard/types';
import { edit, index, show } from '@/routes/procedures';
import type {
    CurrentUit,
    DocumentTypeOption,
    Establishment,
    Procedure,
    ProcedureTypeOption,
} from '@/types';

type Props = {
    procedure: Procedure & {
        taxpayer: Applicant;
        establishment: Establishment;
        types: { id: number }[];
    };
    procedureTypes: ProcedureTypeOption[];
    currentUit: CurrentUit;
    documentTypes: DocumentTypeOption[];
    establishmentOptions: WizardOptions;
};

export default function ProcedureEdit({
    procedure,
    procedureTypes,
    currentUit,
    documentTypes,
    establishmentOptions,
}: Props) {
    return (
        <>
            <Head title={`Editar trámite ${procedure.code}`} />

            <ProcedureWizard
                title={`Editar trámite ${procedure.code}`}
                description="Solo se puede editar antes de emitir la orden de pago."
                action={ProcedureController.update(procedure.id)}
                initial={{
                    procedure_type_ids: procedure.types.map((type) => type.id),
                    taxpayer_id: procedure.taxpayer_id,
                    taxpayer: null,
                    establishment_id: procedure.establishment_id,
                    establishment: null,
                    file_number: procedure.file_number ?? '',
                    folios: procedure.folios?.toString() ?? '',
                    notes: procedure.notes ?? '',
                }}
                initialApplicant={procedure.taxpayer}
                initialEstablishmentLabel={`${procedure.establishment.activity} · ${procedure.establishment.full_address}`}
                procedureTypes={procedureTypes}
                currentUit={currentUit}
                documentTypes={documentTypes}
                options={establishmentOptions}
                cancelHref={show(procedure.id).url}
                submitLabel="Guardar cambios"
            />
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
