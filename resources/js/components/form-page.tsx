import { Form, Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type FormDefinition = Pick<ComponentProps<typeof Form>, 'action' | 'method'>;

/**
 * Full-page create/edit form: heading, the fields and Cancel/Save actions.
 * Fields are validated live with Precognition (<Form noValidate>).
 */
export default function FormPage({
    title,
    description,
    form,
    cancelHref,
    submitLabel = 'Guardar',
    children,
}: {
    title: string;
    description?: string;
    form: FormDefinition;
    cancelHref: string;
    submitLabel?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-5 p-4 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Heading title={title} description={description} />
            </div>

            <Form
                noValidate
                {...form}
                className="mx-auto w-full max-w-3xl space-y-8 rounded-2xl border bg-card p-6"
            >
                {({ processing }) => (
                    <>
                        {children}

                        <div className="flex justify-end gap-2 border-t pt-6">
                            <Button type="button" variant="secondary" asChild>
                                <Link href={cancelHref}>Cancelar</Link>
                            </Button>
                            {/* Only `processing` disables submit (see UitFormDialog). */}
                            <Button
                                disabled={processing}
                                data-test="save-button"
                            >
                                {processing && <Spinner />}
                                {submitLabel}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}
