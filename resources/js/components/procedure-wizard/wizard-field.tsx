import type { ComponentProps, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Label + control + error, the building block of every wizard step.
 */
export function WizardField({
    id,
    label,
    error,
    className,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={cn('grid content-start gap-2', className)}>
            <Label htmlFor={id}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

/**
 * Controlled text input bound to one wizard value.
 */
export function WizardInput({
    id,
    label,
    value,
    onChange,
    error,
    className,
    ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <WizardField id={id} label={label} error={error} className={className}>
            <Input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                {...props}
            />
        </WizardField>
    );
}
