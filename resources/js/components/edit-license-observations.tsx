import { Form, usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import LicenseObservationsField from '@/components/license-observations-field';
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

/**
 * Changes the observations printed on the operating licence (only for
 * whoever manages procedures). The change stays in the procedure history.
 */
export default function EditLicenseObservations({
    license,
    standard,
    max,
}: {
    license: { id: number; number: string; observations: string };
    standard: string;
    max: number;
}) {
    const [open, setOpen] = useState(false);
    const { permissions } = usePage().props.auth;

    if (!permissions.includes('procedures.manage')) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Pencil />
                    Editar
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Observaciones de {license.number}</DialogTitle>
                <DialogDescription>
                    Lo que quede aquí sale impreso en la licencia. Si ya se
                    entregó, reimprímela para que el papel coincida.
                </DialogDescription>
                <Form
                    noValidate
                    {...LicenseController.updateObservations.form(license.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="min-w-0 space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <LicenseObservationsField
                                id={`observations_${license.id}`}
                                defaultValue={license.observations}
                                standard={standard}
                                max={max}
                                error={errors.observations}
                            />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Guardar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
