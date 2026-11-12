import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Download,
    Eye,
    History,
    MapPin,
    Printer,
} from 'lucide-react';
import { useState } from 'react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import FormSelect from '@/components/form-select';
import type { SelectOption } from '@/components/form-select';
import InputError from '@/components/input-error';
import LicenseStatusBadge, {
    LicensePendingBadge,
} from '@/components/license-status-badge';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { ago, toDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { index, show } from '@/routes/licenses';
import type { LicenseStatusValue, Paginated } from '@/types';

const DEFAULT_SORT = '-issued_at';

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

type LicenseRow = {
    id: number;
    number: string;
    issued_at: string;
    holder_name: string;
    holder_document: string;
    trade_name: string | null;
    activity: string;
    address: string;
    type: string;
    type_label: string;
    status: LicenseStatusValue;
    status_label: string;
    /** Imported from the old system and not yet confirmed in force. */
    needs_confirmation: boolean;
};

type Filters = {
    search: string | null;
    type: string | null;
    status: string | null;
    year: string | null;
    confirmation: string | null;
    sort: string;
};

function params({ search, type, status, year, confirmation, sort }: Filters) {
    const filter = Object.fromEntries(
        Object.entries({ search, type, status, year, confirmation }).filter(
            ([, value]) => value,
        ),
    );

    return {
        ...(Object.keys(filter).length ? { filter } : {}),
        ...(sort !== DEFAULT_SORT ? { sort } : {}),
    };
}

/**
 * Reloads the list with Spatie Query Builder params, back on page 1.
 */
function visit(filters: Filters) {
    router.get(index().url, params(filters), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        only: ['licenses', 'filters', 'pending_count'],
    });
}

/**
 * Licences and sign authorizations: replaces the old "Reporte de licencias"
 * and "Reporte de letreros", with the same filters exported to Excel.
 */
export default function LicenseIndex({
    licenses,
    filters,
    types,
    statuses,
    pending_count,
}: {
    licenses: Paginated<LicenseRow>;
    filters: Filters;
    types: SelectOption[];
    statuses: SelectOption[];
    pending_count: number;
}) {
    const { permissions } = usePage().props.auth;
    const canConfirm =
        permissions.includes('procedures.manage') ||
        permissions.includes('itse.manage');

    // Only licences still to confirm can be selected: it is the bulk action.
    const pendingIds = licenses.data
        .filter((license) => license.needs_confirmation)
        .map((license) => license.id);
    const selectable = canConfirm && pendingIds.length > 0;

    const [picked, setPicked] = useState<number[]>([]);
    // Drop picks that left the page after filtering or paginating.
    const selected = picked.filter((id) => pendingIds.includes(id));
    const allSelected =
        selected.length > 0 && selected.length === pendingIds.length;

    const toggle = (id: number) =>
        setPicked(
            selected.includes(id)
                ? selected.filter((value) => value !== id)
                : [...selected, id],
        );

    const tabs: {
        key: string;
        label: string;
        active: boolean;
        apply: Pick<Filters, 'status' | 'confirmation'>;
    }[] = [
        {
            key: 'all',
            label: 'Todas',
            active: !filters.status && !filters.confirmation,
            apply: { status: null, confirmation: null },
        },
        ...statuses.map((status) => ({
            key: status.value,
            label: status.label,
            active: filters.status === status.value && !filters.confirmation,
            apply: { status: status.value, confirmation: null },
        })),
    ];
    // "Por confirmar" right after "Vigente", where staff look for it.
    tabs.splice(2, 0, {
        key: 'pending',
        label: 'Por confirmar',
        active: filters.confirmation === 'pending',
        apply: { status: null, confirmation: 'pending' },
    });

    return (
        <>
            <Head title="Licencias" />

            <div className="flex flex-col gap-5 p-4 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1.5">
                        <h1 className="text-3xl font-bold">
                            Licencias y autorizaciones
                        </h1>
                        <p className="text-muted-foreground">
                            Documentos emitidos por la municipalidad,
                            verificables por código QR.
                        </p>
                    </div>

                    <Button variant="outline" asChild>
                        <a
                            href={LicenseController.export.url({
                                query: params(filters),
                            })}
                        >
                            <Download />
                            Exportar a Excel
                        </a>
                    </Button>
                </div>

                {pending_count > 0 && filters.confirmation !== 'pending' && (
                    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#f1d9a6] bg-[#fff6e3] px-5 py-4 dark:border-amber-400/30 dark:bg-amber-400/10">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fbe7b8] text-[#85520a] dark:bg-amber-400/20 dark:text-amber-300">
                            <History className="size-5" />
                        </span>
                        <div className="min-w-60 flex-1">
                            <p className="font-semibold text-[#5c3a06] dark:text-amber-200">
                                {pending_count === 1
                                    ? '1 licencia del sistema anterior espera confirmación'
                                    : `${pending_count.toLocaleString('es-PE')} licencias del sistema anterior esperan confirmación`}
                            </p>
                            <p className="text-sm text-[#6e4a10] dark:text-amber-200/80">
                                Verifica que el establecimiento siga funcionando
                                y confirma su vigencia.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="border-[#d9b46a] bg-white text-[#5c3a06] hover:bg-[#fffaf0] dark:border-amber-400/40 dark:bg-transparent dark:text-amber-200"
                            onClick={() =>
                                visit({
                                    ...filters,
                                    status: null,
                                    confirmation: 'pending',
                                })
                            }
                        >
                            Revisar pendientes
                        </Button>
                    </div>
                )}

                <section
                    aria-label="Listado de licencias"
                    className="overflow-hidden rounded-2xl border bg-card"
                >
                    <nav
                        aria-label="Filtrar por estado"
                        className="flex gap-1 overflow-x-auto border-b px-4"
                    >
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                aria-pressed={tab.active}
                                onClick={() =>
                                    visit({ ...filters, ...tab.apply })
                                }
                                className={cn(
                                    'h-12 shrink-0 px-3 text-sm whitespace-nowrap transition-colors',
                                    tab.active
                                        ? 'font-bold text-foreground shadow-[inset_0_-3px_0_var(--gold-strong)]'
                                        : 'font-medium text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    <div className="flex flex-wrap items-center gap-3 p-4">
                        <SearchInput
                            initial={filters.search ?? ''}
                            placeholder="N°, titular, DNI/RUC, giro o dirección"
                            label="Buscar licencia"
                            onSearch={(search) =>
                                visit({ ...filters, search: search || null })
                            }
                        />
                        <div className="w-60">
                            <FormSelect
                                id="type"
                                name="type"
                                options={types}
                                defaultValue={filters.type}
                                emptyLabel="Todos los documentos"
                                onValueChange={(type) =>
                                    visit({ ...filters, type: type || null })
                                }
                            />
                        </div>
                        <Input
                            type="number"
                            className="w-28"
                            placeholder="Año"
                            aria-label="Año de emisión"
                            defaultValue={filters.year ?? ''}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    visit({
                                        ...filters,
                                        year: event.currentTarget.value || null,
                                    });
                                }
                            }}
                            onBlur={(event) => {
                                if (
                                    (event.target.value || null) !==
                                    filters.year
                                ) {
                                    visit({
                                        ...filters,
                                        year: event.target.value || null,
                                    });
                                }
                            }}
                        />
                    </div>

                    {selected.length > 0 && (
                        <BulkBar ids={selected} onDone={() => setPicked([])} />
                    )}

                    {licenses.data.length === 0 ? (
                        <div className="border-t px-4 py-14 text-center">
                            <p className="font-semibold">
                                No hay licencias con esos filtros
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Prueba con otro estado o quita los filtros.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px] text-sm">
                                <thead className="border-y bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <tr>
                                        {selectable && (
                                            <th className="w-12 px-4 py-3">
                                                <Checkbox
                                                    aria-label="Seleccionar las licencias por confirmar de esta página"
                                                    checked={
                                                        allSelected
                                                            ? true
                                                            : selected.length >
                                                                0
                                                              ? 'indeterminate'
                                                              : false
                                                    }
                                                    onCheckedChange={() =>
                                                        setPicked(
                                                            allSelected
                                                                ? []
                                                                : pendingIds,
                                                        )
                                                    }
                                                />
                                            </th>
                                        )}
                                        <SortableHeader
                                            column="number"
                                            sort={filters.sort}
                                            onSort={(sort) =>
                                                visit({ ...filters, sort })
                                            }
                                        >
                                            N°
                                        </SortableHeader>
                                        <th className="px-4 py-3 font-semibold">
                                            Titular
                                        </th>
                                        <th className="px-4 py-3 font-semibold">
                                            Establecimiento y giro
                                        </th>
                                        <th className="px-4 py-3 font-semibold">
                                            Estado
                                        </th>
                                        <SortableHeader
                                            column="issued_at"
                                            sort={filters.sort}
                                            onSort={(sort) =>
                                                visit({ ...filters, sort })
                                            }
                                        >
                                            Emisión
                                        </SortableHeader>
                                        <th className="px-4 py-3 text-right font-semibold">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {licenses.data.map((license) => {
                                        const isSelected = selected.includes(
                                            license.id,
                                        );

                                        return (
                                            <tr
                                                key={license.id}
                                                className={cn(
                                                    'align-middle transition-colors',
                                                    isSelected
                                                        ? 'bg-accent'
                                                        : 'hover:bg-muted/40',
                                                )}
                                            >
                                                {selectable && (
                                                    <td className="px-4 py-4">
                                                        {license.needs_confirmation && (
                                                            <Checkbox
                                                                aria-label={`Seleccionar licencia ${license.number}`}
                                                                checked={
                                                                    isSelected
                                                                }
                                                                onCheckedChange={() =>
                                                                    toggle(
                                                                        license.id,
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <Link
                                                        href={show(license.id)}
                                                        className="font-mono text-[15px] font-semibold tabular-nums hover:text-link hover:underline"
                                                    >
                                                        {license.number}
                                                    </Link>
                                                    <div className="text-xs text-muted-foreground">
                                                        {license.type_label}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-semibold">
                                                        {license.holder_name}
                                                    </div>
                                                    <div className="font-mono text-xs text-muted-foreground">
                                                        {
                                                            license.holder_document
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-medium">
                                                        {license.trade_name
                                                            ? `${license.trade_name} — ${license.activity}`
                                                            : license.activity}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <MapPin className="size-3 shrink-0" />
                                                        {license.address}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        <LicenseStatusBadge
                                                            status={
                                                                license.status
                                                            }
                                                            label={
                                                                license.status_label
                                                            }
                                                        />
                                                        {license.needs_confirmation && (
                                                            <LicensePendingBadge />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div>
                                                        {date.format(
                                                            toDate(
                                                                license.issued_at,
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {ago(license.issued_at)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={show(
                                                                    license.id,
                                                                )}
                                                                aria-label={`Ver licencia ${license.number}`}
                                                            >
                                                                <Eye />
                                                            </Link>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            asChild
                                                        >
                                                            <a
                                                                href={LicenseController.print.url(
                                                                    license.id,
                                                                )}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                aria-label={`Imprimir licencia ${license.number}`}
                                                            >
                                                                <Printer />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {licenses.total > 0 && (
                        <Pagination
                            paginator={licenses}
                            className="border-t px-4 py-3"
                        />
                    )}
                </section>
            </div>
        </>
    );
}

/**
 * Selected licences pending confirmation: confirm them all with one basis,
 * e.g. after a Fiscalización operation.
 */
function BulkBar({ ids, onDone }: { ids: number[]; onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const count =
        ids.length === 1
            ? '1 licencia seleccionada'
            : `${ids.length} licencias seleccionadas`;

    return (
        <div className="mx-4 mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-sidebar py-2 pr-2 pl-4 text-sidebar-foreground">
            <strong className="min-w-40 flex-1 text-sm text-white">
                {count}
            </strong>
            <Dialog open={open} onOpenChange={setOpen}>
                <Button
                    size="sm"
                    onClick={() => setOpen(true)}
                    className="bg-gold font-bold text-[#1a1d21] hover:bg-gold/90"
                >
                    <BadgeCheck />
                    Confirmar vigencia
                </Button>
                <DialogContent>
                    <DialogTitle>Confirmar vigencia de {count}</DialogTitle>
                    <DialogDescription>
                        Confirma que estos establecimientos siguen funcionando.
                        Desde ahora sus QR mostrarán las licencias como vigentes
                        sin advertencias.
                    </DialogDescription>
                    <Form
                        noValidate
                        {...LicenseController.confirmMany.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={() => {
                            setOpen(false);
                            onDone();
                        }}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                {ids.map((id) => (
                                    <input
                                        key={id}
                                        type="hidden"
                                        name="ids[]"
                                        value={id}
                                    />
                                ))}
                                <div className="grid gap-2">
                                    <Label htmlFor="bulk_confirmation_note">
                                        Sustento
                                    </Label>
                                    <textarea
                                        id="bulk_confirmation_note"
                                        name="confirmation_note"
                                        rows={3}
                                        maxLength={255}
                                        placeholder="Operativo de fiscalización del 10/11/2026: locales en funcionamiento."
                                        aria-invalid={
                                            errors.confirmation_note
                                                ? true
                                                : undefined
                                        }
                                        className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
                                    />
                                    <InputError
                                        message={
                                            errors.confirmation_note ??
                                            errors.ids
                                        }
                                    />
                                </div>
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                        >
                                            Cancelar
                                        </Button>
                                    </DialogClose>
                                    <Button disabled={processing}>
                                        {processing && <Spinner />}
                                        Confirmar
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
            <Button
                size="sm"
                variant="ghost"
                onClick={onDone}
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
            >
                Quitar selección
            </Button>
        </div>
    );
}

LicenseIndex.layout = {
    breadcrumbs: [{ title: 'Licencias', href: index() }],
};
