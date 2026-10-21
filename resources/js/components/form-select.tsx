import { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const EMPTY = '__empty__';

export type SelectOption = { value: string; label: string };

/**
 * Radix Select for Inertia <Form>s. Radix forbids an empty option value, so
 * the selection is mirrored into a hidden input that submits "" for none.
 */
export default function FormSelect({
    id,
    name,
    options,
    defaultValue,
    emptyLabel,
    invalid,
    onValueChange,
}: {
    id: string;
    name: string;
    options: SelectOption[];
    defaultValue?: string | null;
    /** Label of the "none" option; omit to make a value mandatory. */
    emptyLabel?: string;
    invalid?: boolean;
    onValueChange?: (value: string) => void;
}) {
    const [value, setValue] = useState(
        defaultValue ?? (emptyLabel ? EMPTY : (options[0]?.value ?? '')),
    );

    return (
        <>
            <input
                type="hidden"
                name={name}
                value={value === EMPTY ? '' : value}
            />
            <Select
                value={value}
                onValueChange={(next) => {
                    setValue(next);
                    onValueChange?.(next === EMPTY ? '' : next);
                }}
            >
                <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-invalid={invalid ? true : undefined}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {emptyLabel && (
                        <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>
                    )}
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}
