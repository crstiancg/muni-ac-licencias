export type RiskLevelValue = 'bajo' | 'medio' | 'alto' | 'muy_alto';

export type RiskLevelOption = {
    value: RiskLevelValue;
    label: string;
    prior_itse: boolean;
};

export type ProcedureType = {
    id: number;
    tupa_code: string | null;
    name: string;
    description: string | null;
    uit_percentage: string;
    risk_level: RiskLevelValue | null;
    document_type: 'licencia' | 'anuncio' | null;
    validity_months: number | null;
    license_effect: 'reemplaza' | 'cese' | 'cese_temporal' | 'duplicado' | null;
    processing_days: number | null;
    legal_basis: string | null;
    position: number;
    is_active: boolean;
    legacy_id: number | null;
    legacy_amount: string | null;
    /** Fee for the UIT of the current year; null when that UIT is missing. */
    fee: string | null;
    created_at: string | null;
    updated_at: string | null;
};
