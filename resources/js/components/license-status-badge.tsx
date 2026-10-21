import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LicenseStatusValue } from '@/types';

const STYLES: Record<LicenseStatusValue, string> = {
    vigente: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    cese_temporal: 'border-amber-500/40 text-amber-700 dark:text-amber-300',
    cese_definitivo: 'border-zinc-500/40 text-zinc-600 dark:text-zinc-300',
    anulada: 'border-red-500/40 text-red-700 dark:text-red-300',
    caducada: 'border-zinc-500/40 text-zinc-600 dark:text-zinc-300',
    reemplazada: 'border-sky-500/40 text-sky-700 dark:text-sky-300',
};

export default function LicenseStatusBadge({
    status,
    label,
}: {
    status: LicenseStatusValue;
    label: string;
}) {
    return (
        <Badge variant="outline" className={cn(STYLES[status])}>
            {label}
        </Badge>
    );
}
