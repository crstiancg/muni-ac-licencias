import StatusPill from '@/components/status-pill';
import type { StatusTone } from '@/components/status-pill';

export type ItseState = 'vigente' | 'por_vencer' | 'vencido' | 'revocado';

const TONES: Record<ItseState, StatusTone> = {
    vigente: 'success',
    por_vencer: 'warning',
    vencido: 'rust',
    revocado: 'danger',
};

export default function ItseStatusBadge({
    state,
    label,
}: {
    state: ItseState;
    label: string;
}) {
    return (
        <StatusPill tone={TONES[state]}>ITSE {label.toLowerCase()}</StatusPill>
    );
}
