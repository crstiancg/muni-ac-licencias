import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Observations printed on the operating licence. Starts from the given text
 * (the standard warning when issuing); whatever is left here is what prints.
 * The limit is what fits the box of the pre-printed form.
 */
export default function LicenseObservationsField({
    id = 'observations',
    defaultValue,
    standard,
    max,
    error,
}: {
    id?: string;
    defaultValue: string;
    standard: string;
    max: number;
    error?: string;
}) {
    const [value, setValue] = useState(defaultValue);
    const remaining = max - value.length;

    return (
        <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor={id}>Observaciones de la licencia</Label>
                {value !== standard && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setValue(standard)}
                    >
                        <RotateCcw />
                        Texto estándar
                    </Button>
                )}
            </div>
            <textarea
                id={id}
                name="observations"
                rows={4}
                maxLength={max}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={error ? true : undefined}
                className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base uppercase shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
            />
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                <span>
                    Se imprime tal cual. Duplicado y vigencia se agregan solos.
                </span>
                <span
                    className={cn(
                        'shrink-0 tabular-nums',
                        remaining < 30 && 'font-semibold text-foreground',
                    )}
                >
                    {remaining} caracteres libres
                </span>
            </div>
            <InputError message={error} />
        </div>
    );
}
