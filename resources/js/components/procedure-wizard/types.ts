import type {
    DocumentTypeValue,
    EstablishmentOptions,
    TaxpayerSummary,
} from '@/types';

export type NewTaxpayer = {
    document_type: DocumentTypeValue;
    document_number: string;
    name: string;
    ruc: string;
    phone: string;
    email: string;
    address: string;
    district: string;
    province: string;
    department: string;
    representative_name: string;
    representative_document: string;
    representative_sunarp: string;
};

export type NewEstablishment = {
    activity: string;
    trade_name: string;
    economic_sector: string;
    street_type: string;
    street: string;
    number: string;
    interior: string;
    block: string;
    lot: string;
    settlement_type: string;
    settlement_name: string;
    area: string;
    capacity: string;
};

export type WizardData = {
    procedure_type_ids: number[];
    taxpayer_id: number | null;
    taxpayer: NewTaxpayer | null;
    establishment_id: number | null;
    establishment: NewEstablishment | null;
    file_number: string;
    folios: string;
    notes: string;
};

/** The taxpayer chosen in step 2, whether registered or about to be. */
export type Applicant = TaxpayerSummary & { phone?: string | null };

export type WizardOptions = EstablishmentOptions;

export const TAXPAYER_FIELDS: (keyof NewTaxpayer)[] = [
    'document_type',
    'document_number',
    'name',
    'ruc',
    'phone',
    'email',
    'address',
    'district',
    'province',
    'department',
    'representative_name',
    'representative_document',
    'representative_sunarp',
];

export const ESTABLISHMENT_FIELDS: (keyof NewEstablishment)[] = [
    'activity',
    'trade_name',
    'economic_sector',
    'street_type',
    'street',
    'number',
    'interior',
    'block',
    'lot',
    'settlement_type',
    'settlement_name',
    'area',
    'capacity',
];

export const emptyTaxpayer = (
    document_type: DocumentTypeValue,
    document_number: string,
): NewTaxpayer => ({
    document_type,
    document_number,
    name: '',
    ruc: '',
    phone: '',
    email: '',
    address: '',
    district: 'PUNO',
    province: 'PUNO',
    department: 'PUNO',
    representative_name: '',
    representative_document: '',
    representative_sunarp: '',
});

export const emptyEstablishment = (): NewEstablishment => ({
    activity: '',
    trade_name: '',
    economic_sector: '',
    street_type: '',
    street: '',
    number: '',
    interior: '',
    block: '',
    lot: '',
    settlement_type: '',
    settlement_name: '',
    area: '',
    capacity: '',
});
