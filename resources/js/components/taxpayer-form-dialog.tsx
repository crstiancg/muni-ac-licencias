import { Form } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import TaxpayerFormFields from '@/components/taxpayer-form-fields';
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
import type { DocumentTypeOption, Taxpayer } from '@/types';

/**
 * Create (no `taxpayer`) or edit (with `taxpayer`) a taxpayer inside a dialog.
 */
export default function TaxpayerFormDialog({
    taxpayer,
    documentTypes,
    trigger,
}: {
    taxpayer?: Taxpayer;
    documentTypes: DocumentTypeOption[];
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const editing = taxpayer !== undefined;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>
                    {editing
                        ? 'Editar contribuyente'
                        : 'Registrar contribuyente'}
                </DialogTitle>
                <DialogDescription>
                    Consulta el DNI o RUC para traer los datos de RENIEC o
                    SUNAT.
                </DialogDescription>

                <Form
                    noValidate
                    {...(editing
                        ? TaxpayerController.update.form(taxpayer.id)
                        : TaxpayerController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-6"
                >
                    {({ processing }) => (
                        <>
                            <TaxpayerFormFields
                                taxpayer={taxpayer}
                                documentTypes={documentTypes}
                            />

                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>

                                {/* Only `processing` disables submit (see UitFormDialog). */}
                                <Button
                                    disabled={processing}
                                    data-test="save-taxpayer-button"
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
