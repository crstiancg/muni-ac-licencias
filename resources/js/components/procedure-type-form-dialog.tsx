import { Form } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import ProcedureTypeController from '@/actions/App/Http/Controllers/ProcedureTypeController';
import ProcedureTypeFormFields from '@/components/procedure-type-form-fields';
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
import type { ProcedureType, RiskLevelOption } from '@/types';

/**
 * Create (no `procedureType`) or edit (with `procedureType`) a procedure type
 * inside a dialog.
 */
export default function ProcedureTypeFormDialog({
    procedureType,
    riskLevels,
    uitAmount,
    trigger,
}: {
    procedureType?: ProcedureType;
    riskLevels: RiskLevelOption[];
    uitAmount: string | null;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const editing = procedureType !== undefined;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>
                    {editing
                        ? 'Editar tipo de trámite'
                        : 'Registrar tipo de trámite'}
                </DialogTitle>
                <DialogDescription>
                    Procedimiento del TUPA. El monto se calcula con la UIT del
                    año en que se emite la orden de pago.
                </DialogDescription>

                <Form
                    noValidate
                    {...(editing
                        ? ProcedureTypeController.update.form(procedureType.id)
                        : ProcedureTypeController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-6"
                >
                    {({ processing }) => (
                        <>
                            <ProcedureTypeFormFields
                                procedureType={procedureType}
                                riskLevels={riskLevels}
                                uitAmount={uitAmount}
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
                                    data-test="save-procedure-type-button"
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
