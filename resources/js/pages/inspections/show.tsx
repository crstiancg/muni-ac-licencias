import { Head, Link, usePage } from '@inertiajs/react';
import { Check, ExternalLink, MapPin, Plus, X } from 'lucide-react';
import LicenseStatusBadge from '@/components/license-status-badge';
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import {
    formatDateTime,
    RESULT_TONES,
    type InspectedLicense,
    type InspectionRow,
} from '@/lib/inspections';
import { create, index, show } from '@/routes/inspections';
import { show as showLicense } from '@/routes/licenses';
import type { LicenseStatusValue } from '@/types';

type Props = {
    inspection: InspectionRow & {
        notes: string | null;
        holder_name: string | null;
        holder_document: string | null;
        activity: string | null;
        latitude: string | null;
        longitude: string | null;
        gps_accuracy: number | null;
        checks: { label: string; ok: boolean }[];
        license_status_label: string | null;
        license: InspectedLicense | null;
        photos: { id: number; url: string }[];
    };
};

export default function InspectionsShow({ inspection }: Props) {
    const { permissions } = usePage().props.auth;
    const mapUrl =
        inspection.latitude && inspection.longitude
            ? `https://www.google.com/maps?q=${inspection.latitude},${inspection.longitude}`
            : null;

    return (
        <>
            <Head title={inspection.code} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-8">
                <header className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="font-display text-2xl font-bold">
                            {inspection.business_name ?? 'Sin nombre'}
                        </h1>
                        <StatusPill tone={RESULT_TONES[inspection.result]}>
                            {inspection.result_label}
                        </StatusPill>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-mono">{inspection.code}</span>
                        {' · '}
                        {formatDateTime(inspection.visited_at)}
                        {' · '}
                        {inspection.inspector}
                    </p>
                </header>

                <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                    <h2 className="font-display text-lg font-bold">Negocio</h2>
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        {inspection.address && (
                            <Item label="Dirección" wide>
                                {inspection.address}
                            </Item>
                        )}
                        {inspection.license ? (
                            <>
                                <Item label="Licencia">
                                    {permissions.includes('procedures.view') ? (
                                        <Link
                                            href={showLicense(
                                                inspection.license.id,
                                            )}
                                            className="font-mono text-link hover:underline"
                                        >
                                            {inspection.license.number}
                                        </Link>
                                    ) : (
                                        <span className="font-mono">
                                            {inspection.license.number}
                                        </span>
                                    )}
                                </Item>
                                <Item label="Situación de la licencia">
                                    <span className="flex flex-wrap items-center gap-1.5">
                                        <span>
                                            Al visitar:{' '}
                                            {inspection.license_status_label}
                                        </span>
                                        <span className="text-muted-foreground">
                                            ·
                                        </span>
                                        <span>Hoy:</span>
                                        <LicenseStatusBadge
                                            status={
                                                inspection.license
                                                    .status as LicenseStatusValue
                                            }
                                            label={
                                                inspection.license.status_label
                                            }
                                        />
                                    </span>
                                </Item>
                                <Item label="Titular" wide>
                                    {inspection.license.holder_name}
                                </Item>
                                <Item label="Giro" wide>
                                    {inspection.license.activity}
                                </Item>
                            </>
                        ) : (
                            <>
                                {inspection.activity && (
                                    <Item label="Giro">
                                        {inspection.activity}
                                    </Item>
                                )}
                                {(inspection.holder_name ||
                                    inspection.holder_document) && (
                                    <Item label="Responsable">
                                        {[
                                            inspection.holder_name,
                                            inspection.holder_document,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </Item>
                                )}
                            </>
                        )}
                    </dl>
                </section>

                {inspection.checks.length > 0 && (
                    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                        <h2 className="font-display text-lg font-bold">
                            Verificación
                        </h2>
                        <ul className="flex flex-col gap-2 text-sm">
                            {inspection.checks.map((check) => (
                                <li
                                    key={check.label}
                                    className="flex items-center gap-2"
                                >
                                    {check.ok ? (
                                        <Check className="size-4 text-[#12a06f]" />
                                    ) : (
                                        <X className="size-4 text-[#d9473b]" />
                                    )}
                                    <span
                                        className={
                                            check.ok ? '' : 'font-semibold'
                                        }
                                    >
                                        {check.label}
                                        {!check.ok && ': no'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {inspection.notes && (
                    <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4 md:p-5">
                        <h2 className="font-display text-lg font-bold">
                            Observaciones
                        </h2>
                        <p className="text-sm whitespace-pre-line">
                            {inspection.notes}
                        </p>
                    </section>
                )}

                {inspection.photos.length > 0 && (
                    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                        <h2 className="font-display text-lg font-bold">
                            Fotos ({inspection.photos.length})
                        </h2>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {inspection.photos.map((photo, position) => (
                                <a
                                    key={photo.id}
                                    href={photo.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="aspect-square overflow-hidden rounded-xl bg-muted"
                                >
                                    <img
                                        src={photo.url}
                                        alt={`Foto ${position + 1} de la visita`}
                                        loading="lazy"
                                        className="size-full object-cover"
                                    />
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                <section className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
                    <MapPin className="size-5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">
                        {mapUrl
                            ? `Ubicación registrada${inspection.gps_accuracy ? ` (±${inspection.gps_accuracy} m)` : ''}`
                            : 'Sin ubicación registrada'}
                    </span>
                    {mapUrl && (
                        <Button size="sm" variant="outline" asChild>
                            <a href={mapUrl} target="_blank" rel="noreferrer">
                                Ver en el mapa
                                <ExternalLink />
                            </a>
                        </Button>
                    )}
                </section>

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link href={index()}>Volver a Fiscalización</Link>
                    </Button>
                    {inspection.license_id && (
                        <Button asChild>
                            <Link
                                href={create({
                                    query: { license: inspection.license_id },
                                })}
                            >
                                <Plus />
                                Nueva visita a este negocio
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}

function Item({
    label,
    wide,
    children,
}: {
    label: string;
    wide?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={wide ? 'sm:col-span-2' : undefined}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-semibold uppercase">{children}</dd>
        </div>
    );
}

InspectionsShow.layout = ({ inspection }: Props) => ({
    breadcrumbs: [
        { title: 'Fiscalización', href: index() },
        { title: inspection.code, href: show(inspection.id) },
    ],
});
