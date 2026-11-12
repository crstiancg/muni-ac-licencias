import StatusPill from '@/components/status-pill';
import type { StatusTone } from '@/components/status-pill';
import type { PaymentOrderRow } from '@/lib/payment-orders';

const TONES: Record<PaymentOrderRow['status'], StatusTone> = {
    pendiente: 'warning',
    pagada: 'success',
    anulada: 'danger',
};

export default function PaymentOrderStatusBadge({
    status,
    label,
}: {
    status: PaymentOrderRow['status'];
    label: string;
}) {
    return <StatusPill tone={TONES[status]}>{label}</StatusPill>;
}
