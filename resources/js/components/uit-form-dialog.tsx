import { Form } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import UitController from '@/actions/App/Http/Controllers/UitController';
import UitFormFields from '@/components/uit-form-fields';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { Uit } from '@/types';

/**
 * Create (no `uit`) or edit (with `uit`) a UIT inside a dialog.
 */
export default function UitFormDialog({
    uit,
    trigger,
}: {
    uit?: Uit;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const editing = uit !== undefined;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent>
                <DialogTitle>
                    {editing ? `Editar UIT ${uit.year}` : 'Registrar UIT'}
                </DialogTitle>
                <DialogDescription>
                    {editing
                        ? 'Corrige el valor o la base legal de la UIT.'
                        : 'Valor de la Unidad Impositiva Tributaria vigente para un año.'}
                </DialogDescription>

                <Form
                    noValidate
                    {...(editing
                        ? UitController.update.form(uit.id)
                        : UitController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-6"
                >
                    {({ processing }) => (
                        <>
                            <UitFormFields uit={uit} />

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>

                                {/*
                                 * Only `processing` disables submit. Disabling on
                                 * Precognition's `validating` loses the click: the
                                 * field blur fires validate() immediately (leading
                                 * debounce) before the button receives mouseup.
                                 */}
                                <Button
                                    disabled={processing}
                                    data-test="save-uit-button"
                                >
                                    {processing && <Spinner />}
                                    {editing ? 'Guardar cambios' : 'Guardar'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
