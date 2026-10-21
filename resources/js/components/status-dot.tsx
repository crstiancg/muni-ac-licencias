import { cn } from '@/lib/utils';

/**
 * Status dot pinned to the top-right corner of a card (the card must be
 * `relative`): green when active, grey otherwise.
 */
export default function StatusDot({
    active,
    label,
}: {
    active: boolean;
    label: string;
}) {
    return (
        <span
            title={label}
            aria-label={label}
            role="img"
            className={cn(
                'absolute -top-1.5 -right-1.5 size-3 rounded-full ring-4 ring-background',
                active ? 'bg-emerald-500' : 'bg-muted-foreground/40',
            )}
        />
    );
}
