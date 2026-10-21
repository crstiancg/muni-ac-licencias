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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
            <Heading title={title} description={description} />

            <Form
                noValidate
                {...form}
                className="space-y-8 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border"
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
