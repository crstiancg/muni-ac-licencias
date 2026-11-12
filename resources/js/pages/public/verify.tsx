import { Head } from '@inertiajs/react';
import { BadgeCheck, CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import type { ReactNode } from 'react';
import MunicipalCrest from '@/components/municipal-crest';
import SteppedBand from '@/components/stepped-band';
import { cn } from '@/lib/utils';

type VerifiedLicense = {
    number: string;
    type_label: string;
    status: string;
    status_label: string;
    is_valid: boolean;
    /** Imported from the old system and not yet confirmed in force. */
    is_legacy: boolean;
    confirmed_at: string | null;
    status_changed_at: string | null;
    issued_at: string;
    valid_until: string | null;
    holder_name: string;
    trade_name: string | null;
    activity: string;
    address: string;
    area: string | null;
};

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' });

/** Dates come as YYYY-MM-DD; parse at noon so the time zone never shifts the day. */
const formatDate = (value: string) =>
    date.format(new Date(`${value}T12:00:00`));

/**
 * Public page opened by scanning a licence QR. Mobile first: inspectors and
 * citizens read it on a phone in front of the establishment.
 */
export default function Verify({
    license,
    municipality,
}: {
    license: VerifiedLicense | null;
    municipality: string;
}) {
    return (
        <>
            <Head title="Verificación de licencia" />

            <main className="flex min-h-svh flex-col items-center bg-background px-4 py-8">
                <div className="w-full max-w-md space-y-4">
                    <header className="flex flex-col items-center gap-3 text-center">
                        <MunicipalCrest className="size-16 rounded-2xl p-1.5" />
                        <div>
                            <p className="font-display text-lg font-bold">
                                {municipality}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Verificación de documentos emitidos
                            </p>
                        </div>
                        <SteppedBand className="max-w-56" />
                    </header>

                    {license === null ? (
                        <Verdict
                            tone="error"
                            icon={<CircleX className="size-8" />}
                            title="Documento no encontrado"
                            text="El código no corresponde a ningún documento emitido. Puede ser una copia no válida."
                        />
                    ) : (
                        <>
                            <Verdict
                                tone={license.is_valid ? 'ok' : 'warning'}
                                icon={
                                    license.is_valid ? (
                                        <CircleCheck className="size-8" />
                                    ) : (
                                        <CircleAlert className="size-8" />
                                    )
                                }
                                title={license.status_label.toUpperCase()}
                                text={
                                    license.is_valid
                                        ? 'El documento está vigente.'
                                        : `El documento no está vigente${license.status_changed_at ? ` desde el ${formatDate(license.status_changed_at)}` : ''}.`
                                }
                            />

                            {license.is_legacy && license.is_valid && (
                                <p className="rounded-2xl border border-dashed border-[#c9851a] bg-[#fffaf0] p-4 text-sm text-[#6e4a10] dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-200">
                                    Documento emitido en el sistema anterior. Si
                                    el establecimiento cerró, puede no estar
                                    actualizado: confirme su vigencia en la
                                    municipalidad.
                                </p>
                            )}

                            {license.confirmed_at && license.is_valid && (
                                <p className="flex items-center gap-2 rounded-2xl border border-[#bfe3d2] bg-[#e3f3ec] p-4 text-sm text-[#0b6b4f] dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                                    <BadgeCheck className="size-5 shrink-0" />
                                    Vigencia confirmada por la municipalidad el{' '}
                                    {formatDate(license.confirmed_at)}.
                                </p>
                            )}

                            <section className="space-y-4 rounded-2xl border bg-card p-5">
                                <div>
                                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        {license.type_label}
                                    </p>
                                    <p className="font-mono text-2xl font-semibold">
                                        N° {license.number}
                                    </p>
                                </div>
                                <dl className="space-y-3">
                                    <Row
                                        label="Titular"
                                        value={license.holder_name}
                                    />
                                    {license.trade_name && (
                                        <Row
                                            label="Nombre comercial"
                                            value={license.trade_name}
                                        />
                                    )}
                                    <Row
                                        label="Giro"
                                        value={license.activity}
                                    />
                                    <Row
                                        label="Dirección"
                                        value={license.address}
                                    />
                                    {license.area && (
                                        <Row
                                            label="Área"
                                            value={`${Number(license.area).toLocaleString('es-PE')} m²`}
                                        />
                                    )}
                                    <Row
                                        label="Fecha de emisión"
                                        value={formatDate(license.issued_at)}
                                    />
                                    <Row
                                        label="Vigencia"
                                        value={
                                            license.valid_until
                                                ? `Hasta el ${formatDate(license.valid_until)}`
                                                : 'Indeterminada'
                                        }
                                    />
                                </dl>
                            </section>
                        </>
                    )}

                    <p className="text-center text-xs text-muted-foreground">
                        Consultado el {date.format(new Date())}
                    </p>
                </div>
            </main>
        </>
    );
}

/**
 * The answer the citizen came for, readable at arm's length: valid, not in
 * force, or not found.
 */
function Verdict({
    tone,
    icon,
    title,
    text,
}: {
    tone: 'ok' | 'warning' | 'error';
    icon: ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-4 rounded-2xl p-5 text-white',
                tone === 'ok' && 'bg-[#0b6b4f]',
                tone === 'warning' && 'bg-[#85520a]',
                tone === 'error' && 'bg-[#a3261c]',
            )}
        >
            {icon}
            <div>
                <p className="font-display text-2xl font-bold">{title}</p>
                <p className="text-sm opacity-90">{text}</p>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm">{value}</dd>
        </div>
    );
}
