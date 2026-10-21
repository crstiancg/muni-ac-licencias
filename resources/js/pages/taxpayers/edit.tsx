import { Head } from '@inertiajs/react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import FormPage from '@/components/form-page';
import TaxpayerFormFields from '@/components/taxpayer-form-fields';
import { edit, index, show } from '@/routes/taxpayers';
import type { DocumentTypeOption, Taxpayer } from '@/types';

type Props = { taxpayer: Taxpayer; documentTypes: DocumentTypeOption[] };

export default function TaxpayerEdit({ taxpayer, documentTypes }: Props) {
    return (
        <>
            <Head title={`Editar ${taxpayer.name}`} />

            <FormPage
                title="Editar contribuyente"
                description={taxpayer.name}
                form={TaxpayerController.update.form(taxpayer.id)}
                cancelHref={show(taxpayer.id).url}
                submitLabel="Guardar cambios"
            >
                <TaxpayerFormFields
                    taxpayer={taxpayer}
                    documentTypes={documentTypes}
                />
            </FormPage>
        </>
    );
}

TaxpayerEdit.layout = ({ taxpayer }: Props) => ({
    breadcrumbs: [
        { title: 'Contribuyentes', href: index() },
        { title: taxpayer.name, href: show(taxpayer.id) },
        { title: 'Editar', href: edit(taxpayer.id) },
    ],
});
