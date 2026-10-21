import { Head } from '@inertiajs/react';
import { CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { cn } from '@/lib/utils';

type VerifiedLicense = {
    number: string;
    type_label: string;
    status: string;
    status_label: string;
    is_valid: boolean;
    is_legacy: boolean;
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

            <main className="flex min-h-svh flex-col items-center bg-muted/40 px-4 py-8">
                <div className="w-full max-w-md space-y-4">
                    <div className="text-center">
                        <div className="text-sm font-semibold tracking-wide uppercase">
                            {municipality}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Verificación de documentos emitidos
                        </div>
                    </div>

                    {license === null ? (
                        <Banner
                            tone="error"
                            icon={<CircleX className="size-8" />}
                            title="Documento no encontrado"
                            text="El código no corresponde a ningún documento emitido. Puede ser una copia no válida."
                        />
                    ) : (
                        <>
                            <Banner
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
                                <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                                    Documento emitido en el sistema anterior. Si
                                    el establecimiento cerró, puede no estar
                                    actualizado: confirme su vigencia en la
                                    municipalidad.
                                </p>
                            )}

                            <section className="space-y-3 rounded-xl border bg-background p-5">
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        {license.type_label}
                                    </div>
                                    <div className="text-lg font-semibold tabular-nums">
                                        N° {license.number}
                                    </div>
                                </div>
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
                                <Row label="Giro" value={license.activity} />
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

function Banner({
    tone,
    icon,
    title,
    text,
}: {
    tone: 'ok' | 'warning' | 'error';
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-4 rounded-xl p-5 text-white',
                tone === 'ok' && 'bg-emerald-600',
                tone === 'warning' && 'bg-amber-600',
                tone === 'error' && 'bg-red-600',
            )}
        >
            {icon}
            <div>
                <div className="text-xl font-bold">{title}</div>
                <div className="text-sm opacity-90">{text}</div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm">{value}</div>
        </div>
    );
}
