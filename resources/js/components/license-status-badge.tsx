import { Clock } from 'lucide-react';
import StatusPill from '@/components/status-pill';
import type { StatusTone } from '@/components/status-pill';
import { Badge } from '@/components/ui/badge';
import type { LicenseStatusValue } from '@/types';

const TONES: Record<LicenseStatusValue, StatusTone> = {
    vigente: 'success',
    cese_temporal: 'warning',
    cese_definitivo: 'neutral',
    anulada: 'danger',
    caducada: 'rust',
    reemplazada: 'violet',
};

export default function LicenseStatusBadge({
    status,
    label,
}: {
    status: LicenseStatusValue;
    label: string;
}) {
    return <StatusPill tone={TONES[status]}>{label}</StatusPill>;
}

/**
 * Imported from the old system and not yet confirmed in force: a dashed
 * outline so it reads as "pending", never as a status of its own.
 */
export function LicensePendingBadge() {
    return (
        <Badge
            variant="outline"
            title="Del sistema anterior: confirmar si sigue funcionando"
            className="rounded-full border-dashed border-[#c9851a] bg-[#fffaf0] px-2.5 font-semibold text-[#85520a] dark:border-amber-400/60 dark:bg-amber-400/10 dark:text-amber-300"
        >
            <Clock />
            Por confirmar
        </Badge>
    );
}
