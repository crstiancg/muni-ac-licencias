import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Area of the premises as clerks measured it in the old system: length ×
 * width. Typing both fills the area; the area can still be typed directly
 * (irregular premises). Only the area is stored.
 */
export default function AreaInput({
    id,
    name,
    value,
    onChange,
    onBlur,
    error,
}: {
    id: string;
    /** Submit the area under this name (uncontrolled <Form>s). */
    name?: string;
    value: string;
    onChange: (area: string) => void;
    onBlur?: () => void;
    error?: string;
}) {
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');

    function measure(nextLength: string, nextWidth: string) {
        setLength(nextLength);
        setWidth(nextWidth);

        const area = Number(nextLength) * Number(nextWidth);

        if (area > 0) {
            onChange(area.toFixed(2));
        }
    }

    return (
        <div className="grid content-start gap-2">
            <Label htmlFor={id}>Área (m²)</Label>
            <div className="flex items-center gap-1.5">
                <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={length}
                    onChange={(event) => measure(event.target.value, width)}
                    placeholder="Largo"
                    aria-label="Largo (m)"
                    className="min-w-0"
                />
                <span className="text-muted-foreground">×</span>
                <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={width}
                    onChange={(event) => measure(length, event.target.value)}
                    placeholder="Ancho"
                    aria-label="Ancho (m)"
                    className="min-w-0"
                />
                <span className="text-muted-foreground">=</span>
                <Input
                    id={id}
                    name={name}
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    placeholder="m²"
                    aria-invalid={error ? true : undefined}
                    className="min-w-0"
                />
            </div>
            <InputError message={error} />
        </div>
    );
}
