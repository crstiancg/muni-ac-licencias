import type { RiskLevelOption, RiskLevelValue } from './procedure-type';
import type { Taxpayer } from './taxpayer';

export type TaxpayerSummary = Pick<
    Taxpayer,
    'id' | 'document_type' | 'document_number' | 'ruc' | 'name' | 'address'
>;

export type Establishment = {
    id: number;
    taxpayer_id: number;
    trade_name: string | null;
    activity: string;
    economic_sector: string | null;
    street_type: string | null;
    street: string;
    number: string | null;
    interior: string | null;
    block: string | null;
    lot: string | null;
    settlement_type: string | null;
    settlement_name: string | null;
    area: string | null;
    capacity: number | null;
    risk_level: RiskLevelValue | null;
    legacy_itse_type: string | null;
    legacy_procedure_id: number | null;
    full_address: string;
    taxpayer?: TaxpayerSummary;
    created_at: string | null;
    updated_at: string | null;
};

type Option = { value: string; label: string };

export type EstablishmentOptions = {
    economicSectors: Option[];
    streetTypes: Option[];
    settlementTypes: Option[];
    riskLevels: RiskLevelOption[];
};
