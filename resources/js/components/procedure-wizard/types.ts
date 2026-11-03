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

/** The applicant's sworn declaration, printed when the procedure is registered. */
export type Declaration = {
    representative_name: string;
    representative_document: string;
    representative_sunarp: string;
    representative_phone: string;
    length: string;
    width: string;
    flammable_materials: boolean;
    construction_material: string;
    zoning: string;
    extinguisher_pqs_kg: string;
    extinguisher_co2_kg: string;
    signage: boolean;
    breakers: boolean;
    first_aid_kit: boolean;
    wiring_conduits: boolean;
    sign: boolean;
    sign_luminous: boolean | null;
    sign_features: string;
    sign_material: string;
    sign_description: string;
    sign_length: string;
    sign_height: string;
};

/** The declaration as stored: numbers and nulls instead of form strings. */
export type StoredDeclaration = {
    [K in keyof Declaration]: Declaration[K] extends string
        ? string | number | null
        : Declaration[K];
};

export type WizardData = {
    procedure_type_ids: number[];
    taxpayer_id: number | null;
    taxpayer: NewTaxpayer | null;
    establishment_id: number | null;
    establishment: NewEstablishment | null;
    declaration: Declaration;
};

/** Sections 20-23 of the DJ, declared per procedure in step 2. */
export type RepresentativeField =
    | 'representative_name'
    | 'representative_document'
    | 'representative_sunarp'
    | 'representative_phone';

export const REPRESENTATIVE_FIELDS: RepresentativeField[] = [
    'representative_name',
    'representative_document',
    'representative_sunarp',
    'representative_phone',
];

/** The taxpayer chosen in step 2, whether registered or about to be. */
export type Applicant = TaxpayerSummary & {
    phone?: string | null;
} & Partial<Record<RepresentativeField, string | null>>;

/** Representative fields prefilled from a registered taxpayer's file. */
export const representativeOf = (
    applicant: Applicant | null,
): Pick<Declaration, RepresentativeField> =>
    Object.fromEntries(
        REPRESENTATIVE_FIELDS.map((key) => [key, applicant?.[key] ?? '']),
    ) as Pick<Declaration, RepresentativeField>;

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

/** Declaration fields validated in step 3 (the representative goes in step 2). */
export const DECLARATION_FIELDS: (keyof Declaration)[] = [
    'length',
    'width',
    'flammable_materials',
    'construction_material',
    'zoning',
    'extinguisher_pqs_kg',
    'extinguisher_co2_kg',
    'signage',
    'breakers',
    'first_aid_kit',
    'wiring_conduits',
    'sign',
    'sign_luminous',
    'sign_features',
    'sign_material',
    'sign_description',
    'sign_length',
    'sign_height',
];

/** Safety measures default to "Sí", as in the old system. */
export const emptyDeclaration = (): Declaration => ({
    representative_name: '',
    representative_document: '',
    representative_sunarp: '',
    representative_phone: '',
    length: '',
    width: '',
    flammable_materials: false,
    construction_material: '',
    zoning: '',
    extinguisher_pqs_kg: '',
    extinguisher_co2_kg: '',
    signage: true,
    breakers: true,
    first_aid_kit: true,
    wiring_conduits: true,
    sign: false,
    sign_luminous: null,
    sign_features: '',
    sign_material: '',
    sign_description: '',
    sign_length: '',
    sign_height: '',
});

/** A stored declaration back into form values (editing a procedure). */
export const declarationFrom = (
    stored: StoredDeclaration | null,
): Declaration => {
    const empty = emptyDeclaration();

    if (!stored) {
        return empty;
    }

    return Object.fromEntries(
        Object.entries(empty).map(([key, fallback]) => {
            const value = stored[key as keyof Declaration];

            return [
                key,
                typeof fallback === 'string'
                    ? (value ?? '').toString()
                    : (value ?? fallback),
            ];
        }),
    ) as Declaration;
};
