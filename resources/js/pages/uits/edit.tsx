import { Form, Head, Link } from '@inertiajs/react';
import UitController from '@/actions/App/Http/Controllers/UitController';
import Heading from '@/components/heading';
import UitFormFields from '@/components/uit-form-fields';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/uits';
import type { Uit } from '@/types';

export default function EditUit({ uit }: { uit: Uit }) {
    return (
        <>
            <Head title={`Editar UIT ${uit.year}`} />

            <div className="max-w-xl p-4">
                <Heading
                    title={`Editar UIT ${uit.year}`}
                    description="Corrige el valor o la base legal de la UIT"
                />

                <Form
                    {...UitController.update.form(uit.id)}
                    className="space-y-6"
                >
                    {({ processing, validating }) => (
                        <>
                            <UitFormFields uit={uit} />

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing || validating}
                                    data-test="update-uit-button"
                                >
                                    Guardar cambios
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

EditUit.layout = {
    breadcrumbs: [
        { title: 'UIT', href: index() },
        { title: 'Editar', href: index() },
    ],
};
