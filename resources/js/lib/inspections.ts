import type { StatusTone } from '@/components/status-pill';

export type InspectionResultValue =
    | 'conforme'
    | 'observado'
    | 'licencia_no_vigente'
    | 'sin_licencia'
    | 'cerrado';

export const RESULT_TONES: Record<InspectionResultValue, StatusTone> = {
    conforme: 'success',
    observado: 'warning',
    licencia_no_vigente: 'danger',
    sin_licencia: 'rust',
    cerrado: 'neutral',
};

export type InspectionRow = {
    id: number;
    code: string;
    visited_at: string;
    license_id: number | null;
    result: InspectionResultValue;
    result_label: string;
    business_name: string | null;
    address: string | null;
    license_number: string | null;
    inspector: string;
};

export type InspectedLicense = {
    id: number;
    number: string;
    series: string | null;
    holder_name: string;
    holder_document: string;
    trade_name: string | null;
    activity: string;
    address: string;
    issued_at: string;
    type_label: string;
    status: string;
    status_label: string;
    is_valid: boolean;
    is_legacy: boolean;
    needs_confirmation: boolean;
};

export type InspectionCaseStatusValue =
    | 'pendiente'
    | 'notificado'
    | 'regularizado'
    | 'derivado';

export type InspectionCaseRow = {
    id: number;
    code: string;
    business_name: string;
    holder_document: string | null;
    address: string;
    activity: string | null;
    status: InspectionCaseStatusValue;
    status_label: string;
    is_open: boolean;
    is_overdue: boolean;
    deadline: string | null;
    inspections_count: number;
};

/** Overdue is shown apart from "notificado": it is what needs a revisit. */
export const caseTone = (
    row: Pick<InspectionCaseRow, 'status' | 'is_overdue'>,
): StatusTone =>
    row.is_overdue
        ? 'danger'
        : {
              pendiente: 'rust' as const,
              notificado: 'info' as const,
              regularizado: 'success' as const,
              derivado: 'violet' as const,
          }[row.status];

/** A date-only value (YYYY-MM-DD) in local time, not shifted by UTC. */
export const formatDate = (value: string) =>
    new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE');

export const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

/**
 * Phone photos weigh 3–6 MB: shrink them to 1600 px JPEG (~300 KB) before
 * uploading over mobile data. Anything the browser cannot decode goes as is
 * and the server decides.
 */
export async function shrinkPhoto(
    file: File,
    maxSide = 1600,
    quality = 0.8,
): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file, {
            imageOrientation: 'from-image',
        });
        const scale = Math.min(
            1,
            maxSide / Math.max(bitmap.width, bitmap.height),
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas
            .getContext('2d')
            ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', quality),
        );

        if (!blob) {
            return file;
        }

        const name = file.name.replace(/\.[^.]+$/, '') || 'foto';

        return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
    } catch {
        return file;
    }
}
