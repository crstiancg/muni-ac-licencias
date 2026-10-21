import { Form, Head, Link } from '@inertiajs/react';
import UitController from '@/actions/App/Http/Controllers/UitController';
import Heading from '@/components/heading';
import UitFormFields from '@/components/uit-form-fields';
import { Button } from '@/components/ui/button';
import { create, index } from '@/routes/uits';

export default function CreateUit() {
    return (
        <>
            <Head title="Registrar UIT" />

            <div className="max-w-xl p-4">
                <Heading
                    title="Registrar UIT"
                    description="Valor de la Unidad Impositiva Tributaria vigente para un año"
                />

                <Form {...UitController.store.form()} className="space-y-6">
                    {({ processing, validating }) => (
                        <>
                            <UitFormFields />

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing || validating}
                                    data-test="save-uit-button"
                                >
                                    Guardar
                                </Button>

                                <Button variant="ghost" asChild>
                                    <Link href={index()}>Cancelar</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

CreateUit.layout = {
    breadcrumbs: [
        { title: 'UIT', href: index() },
        { title: 'Registrar', href: create() },
    ],
};
