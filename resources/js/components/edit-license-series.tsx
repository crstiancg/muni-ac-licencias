import { Form, usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

/**
 * Corrects the pre-printed form series typed when issuing (only for whoever
 * manages procedures). The system number is correlative and never changes.
 */
export default function EditLicenseSeries({
    license,
}: {
    license: { id: number; number: string; series: string | null };
}) {
    const [open, setOpen] = useState(false);
    const { permissions } = usePage().props.auth;

    if (!permissions.includes('procedures.manage')) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    title="Corregir la serie del formato"
                >
                    <Pencil />
                    {license.series ? 'Corregir' : 'Registrar serie'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Serie del formato de {license.number}</DialogTitle>
                <DialogDescription>
                    El número impreso en el formato (SERIE - A). Corrígelo si se
                    tipeó mal al emitir; el cambio queda en el historial del
                    trámite. El número {license.number} no cambia.
                </DialogDescription>
                <Form
                    noValidate
                    {...LicenseController.updateSeries.form(license.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`series_${license.id}`}>
                                    Serie
                                </Label>
                                <Input
                                    id={`series_${license.id}`}
                                    name="series"
                                    required
                                    maxLength={30}
                                    defaultValue={license.series ?? ''}
                                    placeholder="N° impreso en el formato"
                                    aria-invalid={
                                        errors.series ? true : undefined
                                    }
                                />
                                <InputError message={errors.series} />
                            </div>
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
