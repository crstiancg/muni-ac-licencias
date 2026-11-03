import { Head } from '@inertiajs/react';
import ProcedureController from '@/actions/App/Http/Controllers/ProcedureController';
import ProcedureWizard from '@/components/procedure-wizard';
import {
    emptyDeclaration,
    representativeOf,
} from '@/components/procedure-wizard/types';
import type {
    Applicant,
    WizardOptions,
} from '@/components/procedure-wizard/types';
import { create, index } from '@/routes/procedures';
import { show } from '@/routes/taxpayers';
import type {
    CurrentUit,
    DocumentTypeOption,
    ProcedureTypeOption,
} from '@/types';

export default function ProcedureCreate({
    taxpayer,
    establishmentId,
    procedureTypes,
    currentUit,
    documentTypes,
    establishmentOptions,
}: {
    taxpayer: Applicant | null;
    establishmentId: number | null;
    procedureTypes: ProcedureTypeOption[];
    currentUit: CurrentUit;
    documentTypes: DocumentTypeOption[];
    establishmentOptions: WizardOptions;
}) {
    return (
        <>
            <Head title="Nuevo trámite" />

            <ProcedureWizard
                title="Nuevo trámite"
                description="Paso a paso: qué solicita, quién y dónde. Al registrar se genera el código y la declaración jurada para firmar."
                action={ProcedureController.store()}
                initial={{
                    procedure_type_ids: [],
                    taxpayer_id: taxpayer?.id ?? null,
                    taxpayer: null,
                    establishment_id: taxpayer ? establishmentId : null,
                    establishment: null,
                    declaration: {
                        ...emptyDeclaration(),
                        ...representativeOf(taxpayer),
                    },
                }}
                initialApplicant={taxpayer}
                procedureTypes={procedureTypes}
                currentUit={currentUit}
                documentTypes={documentTypes}
                options={establishmentOptions}
                cancelHref={taxpayer ? show(taxpayer.id).url : index().url}
                submitLabel="Registrar y generar DJ"
            />
        </>
    );
}

ProcedureCreate.layout = {
    breadcrumbs: [
        { title: 'Trámites', href: index() },
        { title: 'Nuevo', href: create() },
    ],
};
