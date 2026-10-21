import { Search } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CurrentUit, ProcedureTypeOption } from '@/types';

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
 * Step 1: what the taxpayer asks for (TUPA procedures), with the total.
 */
export default function TypesStep({
    procedureTypes,
    selected,
    onChange,
    currentUit,
    error,
}: {
    procedureTypes: ProcedureTypeOption[];
    selected: number[];
    onChange: (ids: number[]) => void;
    currentUit: CurrentUit;
    error?: string;
}) {
    const [filter, setFilter] = useState('');

    const visible = procedureTypes.filter((type) =>
        `${type.tupa_code ?? ''} ${type.name}`
            .toLowerCase()
            .includes(filter.trim().toLowerCase()),
    );
    const total = procedureTypes
        .filter((type) => selected.includes(type.id))
        .reduce((sum, type) => sum + Number(type.fee ?? 0), 0);

    const toggle = (id: number) =>
        onChange(
            selected.includes(id)
                ? selected.filter((value) => value !== id)
                : [...selected, id],
        );

    return (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="space-y-3">
                <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder="Filtrar procedimientos"
                        aria-label="Filtrar procedimientos"
                        className="pl-9"
                        autoFocus
                    />
                </div>

                <div className="divide-y rounded-lg border">
                    {visible.map((type) => {
                        const checked = selected.includes(type.id);

                        return (
                            <label
                                key={type.id}
                                className={cn(
                                    'flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-accent/50',
                                    checked && 'bg-primary/5',
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(type.id)}
                                    className="mt-0.5 size-4 accent-primary"
                                />
                                <span className="flex-1">
                                    {type.tupa_code && (
                                        <span className="mr-1 text-muted-foreground">
                                            {type.tupa_code}
                                        </span>
                                    )}
                                    {type.name}
                                </span>
                                <span className="whitespace-nowrap tabular-nums">
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

            <aside className="h-fit space-y-3 rounded-lg border p-4 lg:sticky lg:top-4">
                <h3 className="text-sm font-semibold">
                    Seleccionados ({selected.length})
                </h3>
                {selected.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Marca uno o más procedimientos.
                    </p>
                ) : (
                    <ul className="space-y-2 text-sm">
                        {procedureTypes
                            .filter((type) => selected.includes(type.id))
                            .map((type) => (
                                <li
                                    key={type.id}
                                    className="flex justify-between gap-2"
                                >
                                    <span className="line-clamp-2">
                                        {type.name}
                                    </span>
                                    <span className="whitespace-nowrap tabular-nums">
                                        {formatFee(type.fee)}
                                    </span>
                                </li>
                            ))}
                    </ul>
                )}
                <div className="flex justify-between border-t pt-3 font-semibold tabular-nums">
                    <span>Total</span>
                    <span>{currency.format(total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    {currentUit
                        ? `Referencial con la UIT ${currentUit.year}. El monto se fija al emitir la orden de pago.`
                        : 'Falta registrar la UIT del año para calcular montos.'}
                </p>
            </aside>
        </div>
    );
}
