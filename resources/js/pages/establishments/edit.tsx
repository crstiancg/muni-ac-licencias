import { Head } from '@inertiajs/react';
import EstablishmentController from '@/actions/App/Http/Controllers/EstablishmentController';
import EstablishmentFormFields from '@/components/establishment-form-fields';
import FormPage from '@/components/form-page';
import { edit, index } from '@/routes/establishments';
import { show } from '@/routes/taxpayers';
import type { Establishment, EstablishmentOptions } from '@/types';

type Props = { establishment: Establishment; options: EstablishmentOptions };

export default function EstablishmentEdit({ establishment, options }: Props) {
    return (
        <>
            <Head title="Editar establecimiento" />

            <FormPage
                title="Editar establecimiento"
                description={`De ${establishment.taxpayer?.name}`}
                form={EstablishmentController.update.form(establishment.id)}
                cancelHref={show(establishment.taxpayer_id).url}
                submitLabel="Guardar cambios"
            >
                {/* The owner doesn't change here; a transfer is a procedure. */}
                <input
                    type="hidden"
                    name="taxpayer_id"
                    value={establishment.taxpayer_id}
                />
                <EstablishmentFormFields
                    establishment={establishment}
                    options={options}
                />
            </FormPage>
        </>
    );
}

EstablishmentEdit.layout = ({ establishment }: Props) => ({
    breadcrumbs: [
        { title: 'Establecimientos', href: index() },
        { title: 'Editar', href: edit(establishment.id) },
    ],
});
