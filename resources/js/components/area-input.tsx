import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Area of the premises as clerks measured it in the old system: length ×
 * width. Typing both fills the area; the area can still be typed directly
 * (irregular premises). Only the area is stored, unless the length and
 * width are given from outside (the sworn declaration keeps them).
 */
export default function AreaInput({
    id,
    name,
    value,
    onChange,
    onBlur,
    error,
    dimensions,
    onDimensionsChange,
}: {
    id: string;
    /** Submit the area under this name (uncontrolled <Form>s). */
    name?: string;
    value: string;
    onChange: (area: string) => void;
    onBlur?: () => void;
    error?: string;
    /** Length and width kept by the caller instead of here. */
    dimensions?: { length: string; width: string };
    onDimensionsChange?: (length: string, width: string) => void;
}) {
    const [ownLength, setOwnLength] = useState('');
    const [ownWidth, setOwnWidth] = useState('');
    const length = dimensions?.length ?? ownLength;
    const width = dimensions?.width ?? ownWidth;

    function measure(nextLength: string, nextWidth: string) {
        setOwnLength(nextLength);
        setOwnWidth(nextWidth);
        onDimensionsChange?.(nextLength, nextWidth);

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
