import type { Establishment, TaxpayerSummary } from './establishment';
import type { RiskLevelValue } from './procedure-type';
import type { Taxpayer } from './taxpayer';

export type ProcedureStatusValue =
    'registrado' | 'liquidado' | 'pagado' | 'emitido' | 'anulado';

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

export type ProcedureDetail = Omit<Procedure, 'types' | 'taxpayer'> & {
    taxpayer: Taxpayer;
    establishment: Establishment;
    types: ProcedureTypeOption[];
    events: ProcedureEvent[];
    registered_by: { id: number; name: string } | null;
    status_label: string;
    is_editable: boolean;
    is_cancellable: boolean;
};

export type CurrentUit = { year: number; amount: string } | null;
