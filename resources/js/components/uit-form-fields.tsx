import { useFormContext } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Uit } from '@/types';

type UitFormData = Pick<Uit, 'year' | 'amount' | 'legal_basis'>;

/**
 * UIT fields, validated live against the server rules (Precognition).
 * Must be rendered inside an Inertia <Form>.
 */
export default function UitFormFields({ uit }: { uit?: Uit }) {
    const form = useFormContext<UitFormData>();

    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor="year">Año</Label>

                <Input
                    id="year"
                    type="number"
                    name="year"
                    inputMode="numeric"
                    min={1990}
                    defaultValue={uit?.year ?? new Date().getFullYear()}
                    onBlur={() => form?.validate('year')}
                    required
                    autoFocus
                />

                <InputError message={form?.errors.year} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="amount">Valor (S/)</Label>

                <Input
                    id="amount"
                    type="number"
                    name="amount"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    defaultValue={uit?.amount}
                    onBlur={() => form?.validate('amount')}
                    placeholder="5350.00"
                    required
                />

                <InputError message={form?.errors.amount} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="legal_basis">Base legal (opcional)</Label>

                <Input
                    id="legal_basis"
                    name="legal_basis"
                    maxLength={150}
                    defaultValue={uit?.legal_basis ?? ''}
                    onBlur={() => form?.validate('legal_basis')}
                    placeholder="D.S. N° 260-2024-EF"
                />

                <InputError message={form?.errors.legal_basis} />
            </div>
        </>
    );
}
