import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Soft pill with a dot: every status in the system (licences, procedures,
 * ITSE) speaks the same visual language. The dot means statuses are never
 * told apart by hue alone; the graphite theme keeps them the only loud colour.
 */
export type StatusTone =
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'info'
    | 'violet'
    | 'rust';

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
    success: {
        pill: 'bg-[#e3f3ec] text-[#0b6b4f] dark:bg-emerald-400/15 dark:text-emerald-300',
        dot: 'bg-[#12a06f]',
    },
    warning: {
        pill: 'bg-[#fff2d6] text-[#85520a] dark:bg-amber-400/15 dark:text-amber-300',
        dot: 'bg-[#d99a1e]',
    },
    danger: {
        pill: 'bg-[#fce9e7] text-[#a3261c] dark:bg-red-400/15 dark:text-red-300',
        dot: 'bg-[#d9473b]',
    },
    neutral: {
        pill: 'bg-[#eceff2] text-[#3f4a55] dark:bg-zinc-400/15 dark:text-zinc-300',
        dot: 'bg-[#7b8794]',
    },
    info: {
        pill: 'bg-[#e6eefb] text-[#1f4e96] dark:bg-sky-400/15 dark:text-sky-300',
        dot: 'bg-[#3b74d1]',
    },
    violet: {
        pill: 'bg-[#efebfa] text-[#523c99] dark:bg-violet-400/15 dark:text-violet-300',
        dot: 'bg-[#7c63d1]',
    },
    rust: {
        pill: 'bg-[#fbeadf] text-[#8a3a12] dark:bg-orange-400/15 dark:text-orange-300',
        dot: 'bg-[#c9672e]',
    },
};

export default function StatusPill({
    tone,
    children,
    className,
}: {
    tone: StatusTone;
    children: ReactNode;
    className?: string;
}) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'gap-1.5 rounded-full border-transparent px-2.5 font-semibold',
                TONES[tone].pill,
                className,
            )}
        >
            <span
                aria-hidden="true"
                className={cn('size-1.5 rounded-full', TONES[tone].dot)}
            />
            {children}
        </Badge>
    );
}
