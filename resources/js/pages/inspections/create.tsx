import { Head, Link, useForm } from '@inertiajs/react';
import {
    Camera,
    CircleAlert,
    CircleCheck,
    LocateFixed,
    LocateOff,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { LicensePendingBadge } from '@/components/license-status-badge';
import StatusPill from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    formatDateTime,
    RESULT_TONES,
    shrinkPhoto,
    type InspectedLicense,
    type InspectionResultValue,
    type InspectionRow,
} from '@/lib/inspections';
import { cn } from '@/lib/utils';
import { create, index, show, store } from '@/routes/inspections';

type LicenseToInspect = InspectedLicense & {
    valid_until: string | null;
    area: string | null;
    capacity: number | null;
    itse: {
        number: string;
        valid_until: string;
        state: string;
        state_label: string;
    } | null;
    inspections: InspectionRow[];
};

type Props = {
    license: LicenseToInspect | null;
    results: {
        value: InspectionResultValue;
        label: string;
        description: string;
    }[];
    checks: { key: string; label: string }[];
    maxPhotos: number;
};

type Gps =
    | { state: 'locating' }
    | { state: 'ok'; latitude: number; longitude: number; accuracy: number }
    | { state: 'unavailable'; reason: string };

const formatDate = (value: string) =>
    new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE');

export default function InspectionsCreate({
    license,
    results,
    checks,
    maxPhotos,
}: Props) {
    const form = useForm<{
        license_id: number | null;
        result: InspectionResultValue | '';
        checks: Record<string, boolean>;
        notes: string;
        business_name: string;
        holder_name: string;
        holder_document: string;
        address: string;
        activity: string;
        latitude: string;
        longitude: string;
        gps_accuracy: string;
        photos: File[];
    }>({
        license_id: license?.id ?? null,
        result: license ? '' : 'sin_licencia',
        checks: {},
        notes: '',
        business_name: '',
        holder_name: '',
        holder_document: '',
        address: '',
        activity: '',
        latitude: '',
        longitude: '',
        gps_accuracy: '',
        photos: [],
    });

    const gps = useLocation((position) =>
        form.setData((data) => ({
            ...data,
            latitude: position.latitude.toFixed(7),
            longitude: position.longitude.toFixed(7),
            gps_accuracy: String(Math.round(position.accuracy)),
        })),
    );

    const answered = license
        ? checks.every((check) => check.key in form.data.checks)
        : true;
    const anyMismatch = Object.values(form.data.checks).some((ok) => !ok);

    // Suggest the result from what was ticked; the inspector can change it.
    const answer = (key: string, ok: boolean) => {
        const next = { ...form.data.checks, [key]: ok };
        const complete = checks.every((check) => check.key in next);
        const mismatch = Object.values(next).some((value) => !value);

        form.setData((data) => ({
            ...data,
            checks: next,
            result:
                data.result === 'cerrado' || !complete
                    ? data.result
                    : !license?.is_valid
                      ? 'licencia_no_vigente'
                      : mismatch
                        ? 'observado'
                        : 'conforme',
        }));
    };

    const addPhotos = async (files: FileList | null) => {
        if (!files) {
            return;
        }

        const room = maxPhotos - form.data.photos.length;
        const shrunk = await Promise.all(
            Array.from(files)
                .slice(0, room)
                .map((file) => shrinkPhoto(file)),
        );

        form.setData('photos', [...form.data.photos, ...shrunk]);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        // Closed: nothing was compared, whatever was ticked before goes away.
        form.transform((data) =>
            data.result === 'cerrado' ? { ...data, checks: {} } : data,
        );
        form.post(store.url(), { forceFormData: true, preserveScroll: true });
    };

    const closedOrMissing = form.data.result === 'cerrado';

    return (
        <>
            <Head
                title={
                    license
                        ? `Visita · ${license.number}`
                        : 'Negocio sin licencia'
                }
            />

            <form
                onSubmit={submit}
                className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-28 md:p-8 md:pb-28"
            >
                {license ? (
                    <LicenseCard license={license} />
                ) : (
                    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5">
                        <div>
                            <h1 className="font-display text-xl font-bold">
                                Negocio sin licencia
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Registra lo que ves en el local. Queda en la
                                lista de negocios sin licencia para hacerle
                                seguimiento.
                            </p>
                        </div>
                        <TextField
                            id="business_name"
                            label="Nombre del negocio"
                            required
                            value={form.data.business_name}
                            onChange={(value) =>
                                form.setData('business_name', value)
                            }
                            error={form.errors.business_name}
                            placeholder="Como figura en el letrero"
                        />
                        <TextField
                            id="address"
                            label="Dirección"
                            required
                            value={form.data.address}
                            onChange={(value) => form.setData('address', value)}
                            error={form.errors.address}
                            placeholder="Jr. / Av., número, urbanización"
                        />
                        <TextField
                            id="activity"
                            label="Giro"
                            value={form.data.activity}
                            onChange={(value) =>
                                form.setData('activity', value)
                            }
                            error={form.errors.activity}
                            placeholder="Bodega, restaurante, ferretería…"
                        />
                        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
                            <TextField
                                id="holder_name"
                                label="Responsable (si lo da)"
                                value={form.data.holder_name}
                                onChange={(value) =>
                                    form.setData('holder_name', value)
                                }
                                error={form.errors.holder_name}
                            />
                            <TextField
                                id="holder_document"
                                label="DNI / RUC"
                                inputMode="numeric"
                                value={form.data.holder_document}
                                onChange={(value) =>
                                    form.setData(
                                        'holder_document',
                                        value.replace(/\D/g, '').slice(0, 11),
                                    )
                                }
                                error={form.errors.holder_document}
                            />
                        </div>
                    </section>
                )}

                {license && !closedOrMissing && (
                    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                        <h2 className="font-display text-lg font-bold">
                            ¿Coincide con lo que ves?
                        </h2>
                        <ul className="flex flex-col gap-2">
                            {checks.map((check) => (
                                <li
                                    key={check.key}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <span className="text-sm">
                                        {check.label}
                                    </span>
                                    <div className="flex shrink-0 gap-1.5">
                                        {[
                                            { ok: true, label: 'Sí' },
                                            { ok: false, label: 'No' },
                                        ].map((option) => (
                                            <button
                                                key={option.label}
                                                type="button"
                                                onClick={() =>
                                                    answer(check.key, option.ok)
                                                }
                                                aria-pressed={
                                                    form.data.checks[
                                                        check.key
                                                    ] === option.ok
                                                }
                                                className={cn(
                                                    'h-10 w-14 rounded-lg border text-sm font-semibold',
                                                    form.data.checks[
                                                        check.key
                                                    ] === option.ok
                                                        ? option.ok
                                                            ? 'border-[#12a06f] bg-[#e3f3ec] text-[#0b6b4f] dark:bg-emerald-400/15 dark:text-emerald-300'
                                                            : 'border-[#d9473b] bg-[#fce9e7] text-[#a3261c] dark:bg-red-400/15 dark:text-red-300'
                                                        : 'bg-background text-muted-foreground',
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <InputError message={form.errors.checks} />
                    </section>
                )}

                <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                    <h2 className="font-display text-lg font-bold">
                        Resultado
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {results.map((result) => (
                            <button
                                key={result.value}
                                type="button"
                                onClick={() =>
                                    form.setData('result', result.value)
                                }
                                aria-pressed={form.data.result === result.value}
                                className={cn(
                                    'flex flex-col items-start gap-1 rounded-xl border p-3 text-left',
                                    form.data.result === result.value
                                        ? 'border-primary ring-2 ring-ring/40'
                                        : 'bg-background',
                                )}
                            >
                                <StatusPill tone={RESULT_TONES[result.value]}>
                                    {result.label}
                                </StatusPill>
                                <span className="text-xs text-muted-foreground">
                                    {result.description}
                                </span>
                            </button>
                        ))}
                    </div>
                    {license &&
                        form.data.result === 'conforme' &&
                        anyMismatch && (
                            <p className="text-sm text-destructive">
                                Marcaste algo que no coincide: elige "Con
                                observaciones".
                            </p>
                        )}
                    <InputError message={form.errors.result} />

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Observaciones</Label>
                        <textarea
                            id="notes"
                            rows={3}
                            maxLength={2000}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                            placeholder="Qué encontraste: giro distinto, ampliación, ocupación de vía pública…"
                            className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
                        />
                        <InputError message={form.errors.notes} />
                    </div>
                </section>

                <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="font-display text-lg font-bold">
                            Fotos
                        </h2>
                        <span className="text-sm text-muted-foreground">
                            {form.data.photos.length} / {maxPhotos}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {form.data.photos.map((photo, position) => (
                            <PhotoThumb
                                key={`${photo.name}-${position}`}
                                photo={photo}
                                onRemove={() =>
                                    form.setData(
                                        'photos',
                                        form.data.photos.filter(
                                            (_, other) => other !== position,
                                        ),
                                    )
                                }
                            />
                        ))}
                        {form.data.photos.length < maxPhotos && (
                            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm text-muted-foreground hover:bg-accent/50">
                                <Camera className="size-6" />
                                Agregar
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    className="sr-only"
                                    onChange={(event) => {
                                        void addPhotos(event.target.files);
                                        event.target.value = '';
                                    }}
                                />
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Fachada, la licencia exhibida y lo que observes. Se
                        reducen en el celular antes de enviarse.
                    </p>
                    <InputError
                        message={
                            form.errors.photos ??
                            Object.entries(form.errors).find(([key]) =>
                                key.startsWith('photos.'),
                            )?.[1]
                        }
                    />
                </section>

                <GpsStatus gps={gps.status} onRetry={gps.locate} />

                <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
                    <div className="mx-auto flex max-w-3xl gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="h-12"
                            asChild
                        >
                            <Link href={index()}>Cancelar</Link>
                        </Button>
                        <Button
                            type="submit"
                            size="lg"
                            className="h-12 flex-1 text-base"
                            disabled={
                                form.processing ||
                                form.data.result === '' ||
                                (!closedOrMissing && !answered)
                            }
                        >
                            {form.processing && <Spinner />}
                            Registrar visita
                        </Button>
                    </div>
                    {form.progress && (
                        <progress
                            value={form.progress.percentage}
                            max={100}
                            className="mx-auto mt-2 block h-1 w-full max-w-3xl"
                        />
                    )}
                </div>
            </form>
        </>
    );
}

/**
 * What the licence says, to compare on site. Big status first: it is what
 * the inspector needs at a glance.
 */
function LicenseCard({ license }: { license: LicenseToInspect }) {
    const rows: [string, string | null][] = [
        ['Titular', license.holder_name],
        ['Documento', license.holder_document],
        ['Nombre comercial', license.trade_name],
        ['Giro', license.activity],
        ['Dirección', license.address],
        [
            'Área',
            license.area
                ? `${Number(license.area).toLocaleString('es-PE')} m²`
                : null,
        ],
        [
            'Aforo',
            license.capacity !== null ? `${license.capacity} personas` : null,
        ],
        ['Emitida', formatDate(license.issued_at)],
        [
            'Vence',
            license.valid_until
                ? formatDate(license.valid_until)
                : 'Indeterminada',
        ],
    ];

    return (
        <>
            <section
                className={cn(
                    'flex items-center gap-4 rounded-2xl p-4 md:p-5',
                    license.is_valid
                        ? 'bg-[#e3f3ec] text-[#0b6b4f] dark:bg-emerald-400/15 dark:text-emerald-300'
                        : 'bg-[#fce9e7] text-[#a3261c] dark:bg-red-400/15 dark:text-red-300',
                )}
            >
                {license.is_valid ? (
                    <CircleCheck className="size-10 shrink-0" />
                ) : (
                    <CircleAlert className="size-10 shrink-0" />
                )}
                <div className="min-w-0">
                    <p className="font-display text-2xl leading-tight font-bold uppercase">
                        {license.is_valid
                            ? 'Vigente'
                            : `No vigente · ${license.status_label}`}
                    </p>
                    <p className="text-sm">
                        {license.type_label}{' '}
                        <span className="font-mono">{license.number}</span>
                        {license.series && ` · Serie ${license.series}`}
                    </p>
                </div>
            </section>

            {license.needs_confirmation && (
                <p className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                    <LicensePendingBadge />
                    Migrada del sistema anterior: sus ceses casi nunca se
                    registraron. Confirma en el local que el negocio sigue
                    funcionando.
                </p>
            )}

            <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:p-5">
                <h2 className="font-display text-lg font-bold">
                    {license.trade_name ?? license.holder_name}
                </h2>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {rows
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                            <div
                                key={label}
                                className={cn(
                                    ['Dirección', 'Titular'].includes(label) &&
                                        'sm:col-span-2',
                                )}
                            >
                                <dt className="text-xs text-muted-foreground">
                                    {label}
                                </dt>
                                <dd className="font-semibold uppercase">
                                    {value}
                                </dd>
                            </div>
                        ))}
                    <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">ITSE</dt>
                        <dd className="font-semibold">
                            {license.itse ? (
                                <>
                                    <StatusPill
                                        tone={
                                            license.itse.state === 'vigente'
                                                ? 'success'
                                                : license.itse.state ===
                                                    'por_vencer'
                                                  ? 'warning'
                                                  : 'danger'
                                        }
                                    >
                                        {license.itse.state_label}
                                    </StatusPill>{' '}
                                    N° {license.itse.number}, hasta el{' '}
                                    {formatDate(license.itse.valid_until)}
                                </>
                            ) : (
                                <span className="text-muted-foreground">
                                    Sin certificado registrado
                                </span>
                            )}
                        </dd>
                    </div>
                </dl>

                {license.inspections.length > 0 && (
                    <div className="border-t pt-3">
                        <h3 className="mb-2 text-sm font-semibold">
                            Visitas anteriores
                        </h3>
                        <ul className="flex flex-col gap-1.5 text-sm">
                            {license.inspections.map((inspection) => (
                                <li key={inspection.id}>
                                    <Link
                                        href={show(inspection.id)}
                                        className="flex flex-wrap items-center gap-2 hover:underline"
                                    >
                                        <StatusPill
                                            tone={
                                                RESULT_TONES[inspection.result]
                                            }
                                        >
                                            {inspection.result_label}
                                        </StatusPill>
                                        <span className="text-muted-foreground">
                                            {formatDateTime(
                                                inspection.visited_at,
                                            )}{' '}
                                            · {inspection.inspector}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </>
    );
}

function TextField({
    id,
    label,
    value,
    onChange,
    error,
    required,
    placeholder,
    inputMode,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    inputMode?: 'numeric';
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {label}
                {required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                inputMode={inputMode}
                className="h-11 uppercase placeholder:normal-case"
                aria-invalid={error ? true : undefined}
            />
            <InputError message={error} />
        </div>
    );
}

function PhotoThumb({
    photo,
    onRemove,
}: {
    photo: File;
    onRemove: () => void;
}) {
    const [url, setUrl] = useState<string>();

    useEffect(() => {
        const objectUrl = URL.createObjectURL(photo);
        setUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [photo]);

    return (
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
            {url && <img src={url} alt="" className="size-full object-cover" />}
            <button
                type="button"
                onClick={onRemove}
                aria-label="Quitar foto"
                className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}

/**
 * Asks for the position once on load; the visit can be recorded without
 * it (permission denied, no signal), the inspector just sees why.
 */
function useLocation(
    onFix: (position: {
        latitude: number;
        longitude: number;
        accuracy: number;
    }) => void,
) {
    const [status, setStatus] = useState<Gps>({ state: 'locating' });

    const locate = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setStatus({
                state: 'unavailable',
                reason: 'Este navegador no da ubicación.',
            });

            return;
        }

        setStatus({ state: 'locating' });
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const fix = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                };
                setStatus({ state: 'ok', ...fix });
                onFix(fix);
            },
            (error) =>
                setStatus({
                    state: 'unavailable',
                    reason:
                        error.code === error.PERMISSION_DENIED
                            ? 'Sin permiso de ubicación.'
                            : 'No se pudo obtener la ubicación.',
                }),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
        );
        // onFix only writes into the form: asking again on every render would loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(locate, [locate]);

    return { status, locate };
}

function GpsStatus({ gps, onRetry }: { gps: Gps; onRetry: () => void }) {
    return (
        <section className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-sm">
            {gps.state === 'ok' ? (
                <LocateFixed className="size-5 shrink-0 text-[#12a06f]" />
            ) : gps.state === 'locating' ? (
                <Spinner />
            ) : (
                <LocateOff className="size-5 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1">
                {gps.state === 'ok'
                    ? `Ubicación registrada (±${Math.round(gps.accuracy)} m)`
                    : gps.state === 'locating'
                      ? 'Obteniendo ubicación…'
                      : `${gps.reason} La visita se registra igual.`}
            </span>
            {gps.state === 'unavailable' && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                >
                    Reintentar
                </Button>
            )}
        </section>
    );
}

InspectionsCreate.layout = ({ license }: Props) => ({
    breadcrumbs: [
        { title: 'Fiscalización', href: index() },
        {
            title: license ? license.number : 'Sin licencia',
            href: create({ query: license ? { license: license.id } : {} }),
        },
    ],
});
