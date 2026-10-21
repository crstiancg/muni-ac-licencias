import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProcedureStatusValue } from '@/types';

const STYLES: Record<ProcedureStatusValue, string> = {
    registrado: 'border-sky-500/40 text-sky-700 dark:text-sky-300',
    liquidado: 'border-amber-500/40 text-amber-700 dark:text-amber-300',
    pagado: 'border-violet-500/40 text-violet-700 dark:text-violet-300',
    emitido: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    anulado: 'border-red-500/40 text-red-700 dark:text-red-300',
};

export default function ProcedureStatusBadge({
    status,
    label,
}: {
    status: ProcedureStatusValue;
    label: string;
}) {
    return (
        <Badge variant="outline" className={cn(STYLES[status])}>
            {label}
        </Badge>
    );
}
