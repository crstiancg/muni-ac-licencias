export type DocumentTypeValue = 'dni' | 'ce' | 'ruc';

export type DocumentTypeOption = {
    value: DocumentTypeValue;
    label: string;
};

export type Taxpayer = {
    id: number;
    document_type: DocumentTypeValue;
    document_number: string;
    ruc: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    district: string | null;
    province: string | null;
    department: string | null;
    representative_name: string | null;
    representative_document: string | null;
    representative_sunarp: string | null;
    representative_phone: string | null;
    legacy_procedure_id: number | null;
    created_at: string | null;
    updated_at: string | null;
};

export type DocumentLookupResult =
    | { source: 'local'; taxpayer: Taxpayer }
    | {
          source: 'reniec' | 'sunat';
          data: {
              name: string;
              address: string | null;
              district: string | null;
              province: string | null;
              department: string | null;
              sunat_status: string | null;
              sunat_condition: string | null;
          };
      };
