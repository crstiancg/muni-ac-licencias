export type PaymentOrderRow = {
    id: number;
    code: string;
    payer_name: string | null;
    payer_document: string | null;
    total: string;
    receipt_number: string | null;
    paid_at: string | null;
    created_at: string;
    kind: 'tramite' | 'libre' | 'mercado';
    kind_label: string;
    status: 'pendiente' | 'pagada' | 'anulada';
    status_label: string;
    procedure: { id: number; code: string } | null;
};

export const ORDER_STATUS_STYLES: Record<PaymentOrderRow['status'], string> = {
    pendiente: 'border-amber-500/40 text-amber-700 dark:text-amber-300',
    pagada: 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    anulada: 'border-red-500/40 text-red-700 dark:text-red-300',
};
