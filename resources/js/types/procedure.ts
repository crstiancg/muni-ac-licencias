import type { StoredDeclaration } from '@/components/procedure-wizard/types';
import type { Establishment, TaxpayerSummary } from './establishment';
import type { RiskLevelValue } from './procedure-type';
import type { Taxpayer } from './taxpayer';

export type ProcedureStatusValue =
    | 'registrado'
    | 'liquidado'
    | 'pagado'
    | 'emitido'
    | 'anulado';

export type ProcedureTypeOption = {
    id: number;
    tupa_code: string | null;
    name: string;
    uit_percentage: string;
    risk_level: RiskLevelValue | null;
    /** Fee for the current year's UIT; null when that UIT is missing. */
    fee: string | null;
};

export type ProcedureEvent = {
    id: number;
    type: string;
    description: string | null;
    created_at: string;
    user: { id: number; name: string } | null;
};

export type Procedure = {
    id: number;
    code: string;
    year: number;
    taxpayer_id: number;
    establishment_id: number;
    status: ProcedureStatusValue;
    declaration: StoredDeclaration | null;
    file_number: string | null;
    folios: number | null;
    notes: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
    taxpayer?: TaxpayerSummary | Taxpayer;
    establishment?: Establishment;
    types?: { id: number; name: string }[];
};

export type PaymentOrder = {
    id: number;
    code: string;
    uit_year: number;
    uit_amount: string;
    total: string;
    status: 'pendiente' | 'pagada' | 'anulada';
    status_label: string;
    receipt_number: string | null;
    paid_at: string | null;
    created_at: string;
    items: {
        id: number;
        description: string;
        uit_percentage: string;
        amount: string;
    }[];
};

export type LicenseStatusValue =
    | 'vigente'
    | 'cese_temporal'
    | 'cese_definitivo'
    | 'anulada'
    | 'caducada'
    | 'reemplazada';

export type LicenseSummary = {
    id: number;
    number: string;
    /** Number printed on the pre-printed form, typed when issuing. */
    series: string | null;
    issued_at: string;
    valid_until: string | null;
    duplicates: number;
    holder_name: string;
    trade_name: string | null;
    activity: string;
    type: 'licencia' | 'anuncio';
    type_label: string;
    status: LicenseStatusValue;
    status_label: string;
    /** Public page the printed QR opens. */
    verification_url: string;
    /** QR as an SVG data URI. */
    qr: string;
};

export type ProcedureDetail = Omit<Procedure, 'types' | 'taxpayer'> & {
    taxpayer: Taxpayer;
    establishment: Establishment;
    types: ProcedureTypeOption[];
    payment_order: PaymentOrder | null;
    licenses: LicenseSummary[];
    documents_to_issue: string[];
    document_types_to_issue: { value: string; label: string }[];
    needs_sign_data: boolean;
    license_effects: string[];
    /** In-force licence of the procedure's own place: the one acted on. */
    establishment_license: {
        id: number;
        number: string;
        series: string | null;
        holder_name: string;
        address: string;
        activity: string;
    } | null;
    related_license: {
        id: number;
        number: string;
        holder_name: string;
        address: string;
        status_label: string;
    } | null;
    events: ProcedureEvent[];
    registered_by: { id: number; name: string } | null;
    status_label: string;
    is_editable: boolean;
    is_cancellable: boolean;
};

export type CurrentUit = { year: number; amount: string } | null;
