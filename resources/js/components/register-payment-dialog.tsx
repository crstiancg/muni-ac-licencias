import { Form } from '@inertiajs/react';
import { Receipt } from 'lucide-react';
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
 * Records the Caja receipt (number and date) of a payment order.
 */
export default function RegisterPaymentDialog({
    form,
    orderCode,
}: {
    form: { action: string; method: 'post' };
    orderCode: string;
}) {
    const today = new Date().toLocaleDateString('en-CA');

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <Receipt />
                    Registrar pago
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Registrar pago</DialogTitle>
                <DialogDescription>
                    Comprobante emitido por Caja para la orden {orderCode}.
                </DialogDescription>
                <Form
                    noValidate
                    {...form}
                    options={{ preserveScroll: true }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="receipt_number">
                                        N° de comprobante
                                    </Label>
                                    <Input
                                        id="receipt_number"
                                        name="receipt_number"
                                        aria-invalid={
                                            errors.receipt_number
                                                ? true
                                                : undefined
                                        }
                                        autoFocus
                                    />
                                    <InputError
                                        message={errors.receipt_number}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="paid_at">
                                        Fecha de pago
                                    </Label>
                                    <Input
                                        id="paid_at"
                                        type="date"
                                        name="paid_at"
                                        defaultValue={today}
                                        max={today}
                                        aria-invalid={
                                            errors.paid_at ? true : undefined
                                        }
                                    />
                                    <InputError message={errors.paid_at} />
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Registrar pago
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
