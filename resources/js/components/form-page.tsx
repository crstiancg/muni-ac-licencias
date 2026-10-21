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
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="-mx-4 -mt-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                <Heading title={title} description={description} />
            </div>

            <Form
                noValidate
                {...form}
                className="mx-auto w-full max-w-3xl space-y-8 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border"
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
