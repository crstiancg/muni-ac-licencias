import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ItseState = 'vigente' | 'por_vencer' | 'vencido' | 'revocado';

const STYLES: Record<ItseState, string> = {
    vigente: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    por_vencer: 'border-amber-500/40 text-amber-700 dark:text-amber-300',
    vencido: 'border-red-500/40 text-red-700 dark:text-red-300',
    revocado: 'border-red-500/40 text-red-700 dark:text-red-300',
};

export default function ItseStatusBadge({
    state,
    label,
}: {
    state: ItseState;
    label: string;
}) {
    return (
        <Badge variant="outline" className={cn(STYLES[state])}>
            ITSE {label.toLowerCase()}
        </Badge>
    );
}
