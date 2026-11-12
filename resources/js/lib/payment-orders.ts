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
