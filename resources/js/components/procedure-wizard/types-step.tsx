import { Check, Search } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProcedureTypeOption } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

export const formatFee = (fee: string | null) =>
    fee === null
        ? '—'
        : Number(fee) === 0
          ? 'Gratuito'
          : currency.format(Number(fee));

/**
 * Step 1: what the taxpayer asks for (TUPA procedures). The selection and
 * its total live in the wizard's summary, visible on every step.
 */
export default function TypesStep({
    procedureTypes,
    selected,
    onChange,
    error,
}: {
    procedureTypes: ProcedureTypeOption[];
    selected: number[];
    onChange: (ids: number[]) => void;
    error?: string;
}) {
    const [filter, setFilter] = useState('');

    const visible = procedureTypes.filter((type) =>
        `${type.tupa_code ?? ''} ${type.name}`
            .toLowerCase()
            .includes(filter.trim().toLowerCase()),
    );

    const toggle = (id: number) =>
        onChange(
            selected.includes(id)
                ? selected.filter((value) => value !== id)
                : [...selected, id],
        );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full max-w-md">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder="Filtrar por nombre o código TUPA"
                        aria-label="Filtrar procedimientos"
                        className="pl-9"
                        autoFocus
                    />
                </div>
                <span className="text-sm text-muted-foreground">
                    {selected.length === 1
                        ? '1 seleccionado'
                        : `${selected.length} seleccionados`}
                </span>
            </div>

            <div className="divide-y overflow-hidden rounded-xl border">
                {visible.map((type) => {
                    const checked = selected.includes(type.id);

                    return (
                        <label
                            key={type.id}
                            className={cn(
                                'flex cursor-pointer items-start gap-3 px-4 py-3 text-sm transition-colors',
                                checked ? 'bg-accent' : 'hover:bg-muted/50',
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(type.id)}
                                className="sr-only"
                            />
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                                    checked
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-input bg-background',
                                )}
                            >
                                {checked && <Check className="size-3.5" />}
                            </span>
                            <span className="flex-1">
                                {type.tupa_code && (
                                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                                        {type.tupa_code}
                                    </span>
                                )}
                                <span
                                    className={cn(checked && 'font-semibold')}
                                >
                                    {type.name}
                                </span>
                            </span>
                            <span className="font-mono whitespace-nowrap tabular-nums">
                                {formatFee(type.fee)}
                            </span>
                        </label>
                    );
                })}
                {visible.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">
                        Ningún procedimiento coincide con “{filter}”.
                    </p>
                )}
            </div>
            <InputError message={error} />
        </div>
    );
}
