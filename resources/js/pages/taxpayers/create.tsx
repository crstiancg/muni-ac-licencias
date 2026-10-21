import { Head } from '@inertiajs/react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import FormPage from '@/components/form-page';
import TaxpayerFormFields from '@/components/taxpayer-form-fields';
import { create, index } from '@/routes/taxpayers';
import type { DocumentTypeOption } from '@/types';

export default function TaxpayerCreate({
    documentTypes,
}: {
    documentTypes: DocumentTypeOption[];
}) {
    return (
        <>
            <Head title="Registrar contribuyente" />

            <FormPage
                title="Registrar contribuyente"
                description="Consulta el DNI o RUC para traer los datos de RENIEC o SUNAT."
                form={TaxpayerController.store.form()}
                cancelHref={index().url}
            >
                <TaxpayerFormFields documentTypes={documentTypes} />
            </FormPage>
        </>
    );
}

TaxpayerCreate.layout = {
    breadcrumbs: [
        { title: 'Contribuyentes', href: index() },
        { title: 'Registrar', href: create() },
    ],
};
