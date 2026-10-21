import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import PaymentOrderController from '@/actions/App/Http/Controllers/PaymentOrderController';
import FormSelect from '@/components/form-select';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import TaxpayerPicker from '@/components/taxpayer-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { create, index } from '@/routes/payment-orders';
import type { TaxpayerSummary } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

type Concept = { id: number; name: string; fee: string | null };

type Line = {
    description: string;
    amount: string;
    procedure_type_id: number | null;
};

type FreeOrderData = {
    taxpayer_id: number | null;
    payer_name: string;
    payer_document: string;
    notes: string;
    items: Line[];
};

const emptyLine = (): Line => ({
    description: '',
    amount: '',
    procedure_type_id: null,
});

/**
 * Payment order for concepts outside a procedure: banners, fines, other
 * activities (the old "boletas"). Paid in Caja like any other order.
 */
export default function PaymentOrderCreate({
    taxpayer,
    concepts,
}: {
    taxpayer: TaxpayerSummary | null;
    concepts: Concept[];
}) {
    const form = useForm<FreeOrderData>({
        taxpayer_id: taxpayer?.id ?? null,
        payer_name: '',
        payer_document: '',
        notes: '',
        items: [emptyLine()],
    });
    const errors = form.errors as Record<string, string | undefined>;
    const total = form.data.items.reduce(
        (sum, line) => sum + (Number(line.amount) || 0),
        0,
    );

    const setLine = (index: number, line: Partial<Line>) =>
        form.setData((data) => ({
            ...data,
            items: data.items.map((current, position) =>
                position === index ? { ...current, ...line } : current,
            ),
        }));

    return (
        <>
            <Head title="Orden por otros conceptos" />

            <div className="flex flex-col gap-6 p-4">
                <Heading
                    title="Orden de pago por otros conceptos"
                    description="Bambalinas, vallas, multas y demás cobros que no salen de un trámite."
                />

                <form
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.submit(PaymentOrderController.store());
                    }}
                    className="space-y-6 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border"
                >
                    <fieldset className="space-y-3">
                        <legend className="mb-2 text-sm font-semibold">
                            Quién paga
                        </legend>
                        <TaxpayerPicker
                            name="taxpayer_lookup"
                            initial={taxpayer}
                            onChange={(selected) =>
                                form.setData(
                                    'taxpayer_id',
                                    selected?.id ?? null,
                                )
                            }
                        />
                        {!form.data.taxpayer_id && (
                            <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
                                <div className="grid gap-2">
                                    <Label htmlFor="payer_name">
                                        O escribe el nombre (si no está
                                        registrado)
                                    </Label>
                                    <Input
                                        id="payer_name"
                                        value={form.data.payer_name}
                                        onChange={(event) =>
                                            form.setData(
                                                'payer_name',
                                                event.target.value,
                                            )
                                        }
                                        aria-invalid={
                                            errors.payer_name ? true : undefined
                                        }
                                    />
                                    <InputError message={errors.payer_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="payer_document">
                                        DNI / RUC
                                    </Label>
                                    <Input
                                        id="payer_document"
                                        value={form.data.payer_document}
                                        onChange={(event) =>
                                            form.setData(
                                                'payer_document',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </fieldset>

                    <fieldset className="space-y-3">
                        <legend className="mb-2 text-sm font-semibold">
                            Conceptos
                        </legend>
                        {form.data.items.map((line, position) => (
                            <div
                                key={position}
                                className="grid items-start gap-3 rounded-lg border p-3 md:grid-cols-[18rem_1fr_9rem_auto]"
                            >
                                <FormSelect
                                    id={`concept_${position}`}
                                    name={`concept_${position}`}
                                    options={concepts.map((concept) => ({
                                        value: String(concept.id),
                                        label: concept.name,
                                    }))}
                                    emptyLabel="Concepto libre"
                                    onValueChange={(value) => {
                                        const concept = concepts.find(
                                            (item) => String(item.id) === value,
                                        );
                                        setLine(position, {
                                            procedure_type_id:
                                                concept?.id ?? null,
                                            description:
                                                concept?.name ??
                                                line.description,
                                            amount: concept?.fee ?? line.amount,
                                        });
                                    }}
                                />
                                <div className="grid gap-1">
                                    <Input
                                        value={line.description}
                                        onChange={(event) =>
                                            setLine(position, {
                                                description: event.target.value,
                                            })
                                        }
                                        placeholder="Detalle (p. ej. 02 bambalinas Av. Floral, 15/05)"
                                        aria-label="Concepto"
                                        aria-invalid={
                                            errors[
                                                `items.${position}.description`
                                            ]
                                                ? true
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        message={
                                            errors[
                                                `items.${position}.description`
                                            ]
                                        }
                                    />
                                </div>
                                <div className="grid gap-1">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        value={line.amount}
                                        onChange={(event) =>
                                            setLine(position, {
                                                amount: event.target.value,
                                            })
                                        }
                                        placeholder="S/"
                                        aria-label="Importe"
                                        aria-invalid={
                                            errors[`items.${position}.amount`]
                                                ? true
                                                : undefined
                                        }
                                    />
                                    <InputError
                                        message={
                                            errors[`items.${position}.amount`]
                                        }
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Quitar concepto"
                                    disabled={form.data.items.length === 1}
                                    onClick={() =>
                                        form.setData(
                                            'items',
                                            form.data.items.filter(
                                                (_, index) =>
                                                    index !== position,
                                            ),
                                        )
                                    }
                                >
                                    <Trash2 />
                                </Button>
                            </div>
                        ))}
                        <InputError message={errors.items} />
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    form.setData('items', [
                                        ...form.data.items,
                                        emptyLine(),
                                    ])
                                }
                            >
                                <Plus />
                                Agregar concepto
                            </Button>
                            <span className="text-lg font-semibold tabular-nums">
                                Total {currency.format(total)}
                            </span>
                        </div>
                    </fieldset>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">
                            Observaciones (proveído, expediente, resolución)
                        </Label>
                        <textarea
                            id="notes"
                            rows={3}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                        />
                        <InputError message={errors.notes} />
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-6">
                        <Button type="button" variant="secondary" asChild>
                            <Link href={index()}>Cancelar</Link>
                        </Button>
                        <Button disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Emitir orden de pago
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

PaymentOrderCreate.layout = {
    breadcrumbs: [
        { title: 'Órdenes de pago', href: index() },
        { title: 'Otros conceptos', href: create() },
    ],
};
