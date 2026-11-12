import StatusPill from '@/components/status-pill';
import type { StatusTone } from '@/components/status-pill';
import type { ProcedureStatusValue } from '@/types';

/** Each step of the procedure, from registration to issued documents. */
const TONES: Record<ProcedureStatusValue, StatusTone> = {
    registrado: 'info',
    liquidado: 'warning',
    pagado: 'violet',
    emitido: 'success',
    anulado: 'danger',
};

export default function ProcedureStatusBadge({
    status,
    label,
}: {
    status: ProcedureStatusValue;
    label: string;
}) {
    return <StatusPill tone={TONES[status]}>{label}</StatusPill>;
}
