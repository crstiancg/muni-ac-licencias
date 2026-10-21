import { Form, Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import ProcedureTypeController from '@/actions/App/Http/Controllers/ProcedureTypeController';
import type { SelectOption } from '@/components/form-select';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import ProcedureTypeFormDialog from '@/components/procedure-type-form-dialog';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { index } from '@/routes/procedure-types';
import type { Paginated, ProcedureType, RiskLevelOption } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const DEFAULT_SORT = 'position';
const DEFAULT_STATUS = 'active';

type Status = 'active' | 'inactive' | 'all';

type Filters = { search: string | null; status: Status; sort: string };

/**
 * Reloads the list with Spatie Query Builder params
 * (?filter[search]=&filter[status]=&sort=), back on page 1. Defaults are left
 * out of the URL.
 */
function visit({ search, status, sort }: Filters) {
    const filter = {
        ...(search ? { search } : {}),
        ...(status !== DEFAULT_STATUS ? { status } : {}),
    };

    router.get(
        index().url,
        {
            ...(Object.keys(filter).length ? { filter } : {}),
            ...(sort !== DEFAULT_SORT ? { sort } : {}),
        },
        {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['procedureTypes', 'filters'],
        },
    );
}

export default function ProcedureTypeIndex({
    procedureTypes,
    filters,
    currentUit,
    riskLevels,
    documentTypes,
    licenseEffects,
}: {
    procedureTypes: Paginated<ProcedureType>;
    filters: Filters;
    currentUit: { year: number; amount: string } | null;
    riskLevels: RiskLevelOption[];
    documentTypes: SelectOption[];
    licenseEffects: SelectOption[];
}) {
    const sortBy = (sort: string) => visit({ ...filters, sort });
    const riskLabel = (value: ProcedureType['risk_level']) =>
        riskLevels.find((level) => level.value === value)?.label;

    return (
        <>
            <Head title="Tipos de trámite" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Tipos de trámite"
                        description={
                            currentUit
                                ? `Procedimientos del TUPA. Montos calculados con la UIT ${currentUit.year} (${currency.format(Number(currentUit.amount))}).`
                                : `Procedimientos del TUPA. Falta registrar la UIT ${new Date().getFullYear()} para calcular los montos.`
                        }
                    />

                    <ProcedureTypeFormDialog
                        riskLevels={riskLevels}
                        documentTypes={documentTypes}
                        licenseEffects={licenseEffects}
                        uitAmount={currentUit?.amount ?? null}
                        trigger={
                            <Button data-test="create-procedure-type-button">
                                <Plus />
                                Registrar tipo
                            </Button>
                        }
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput
                        initial={filters.search ?? ''}
                        placeholder="Buscar por nombre o código TUPA"
                        label="Buscar tipo de trámite"
                        onSearch={(search) =>
                            visit({ ...filters, search: search || null })
                        }
                    />

                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={filters.status}
                        onValueChange={(status) =>
                            status &&
                            visit({ ...filters, status: status as Status })
                        }
                        aria-label="Filtrar por estado"
                    >
                        <ToggleGroupItem value="active">
                            Activos
                        </ToggleGroupItem>
                        <ToggleGroupItem value="inactive">
                            Inactivos
                        </ToggleGroupItem>
                        <ToggleGroupItem value="all">Todos</ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {procedureTypes.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        {filters.search
                            ? `No hay tipos de trámite que coincidan con “${filters.search}”.`
                            : 'No hay tipos de trámite en este estado.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-muted-foreground">
                                <tr>
                                    <SortableHeader
                                        column="position"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        N°
                                    </SortableHeader>
                                    <SortableHeader
                                        column="name"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Procedimiento
                                    </SortableHeader>
                                    <SortableHeader
                                        column="uit_percentage"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                        align="right"
                                    >
                                        % UIT
                                    </SortableHeader>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Monto
                                    </th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">
                                            Acciones
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {procedureTypes.data.map((type) => (
                                    <tr
                                        key={type.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                                            {type.position}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {type.tupa_code && (
                                                    <span className="mr-2 text-muted-foreground">
                                                        {type.tupa_code}
                                                    </span>
                                                )}
                                                {type.name}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {!type.is_active && (
                                                    <Badge variant="secondary">
                                                        Inactivo
                                                    </Badge>
                                                )}
                                                {type.risk_level && (
                                                    <Badge variant="outline">
                                                        Riesgo{' '}
                                                        {riskLabel(
                                                            type.risk_level,
                                                        )?.toLowerCase()}
                                                    </Badge>
                                                )}
                                                {type.processing_days && (
                                                    <Badge variant="outline">
                                                        {type.processing_days}{' '}
                                                        días hábiles
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {Number(
                                                type.uit_percentage,
                                            ).toFixed(4)}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {type.fee === null
                                                ? '—'
                                                : Number(type.fee) === 0
                                                  ? 'Gratuito'
                                                  : currency.format(
                                                        Number(type.fee),
                                                    )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <ProcedureTypeFormDialog
                                                    procedureType={type}
                                                    riskLevels={riskLevels}
                                                    documentTypes={
                                                        documentTypes
                                                    }
                                                    licenseEffects={
                                                        licenseEffects
                                                    }
                                                    uitAmount={
                                                        currentUit?.amount ??
                                                        null
                                                    }
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Editar ${type.name}`}
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                    }
                                                />

                                                <DeleteProcedureType
                                                    procedureType={type}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={procedureTypes} />
            </div>
        </>
    );
}

function DeleteProcedureType({
    procedureType,
}: {
    procedureType: ProcedureType;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${procedureType.name}`}
                >
                    <Trash2 className="text-red-600 dark:text-red-400" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>¿Eliminar este tipo de trámite?</DialogTitle>
                <DialogDescription>
                    Se eliminará «{procedureType.name}». Si solo ya no se
                    ofrece, mejor desactívalo para conservar el historial.
                </DialogDescription>

                <Form
                    noValidate
                    {...ProcedureTypeController.destroy.form(procedureType.id)}
                    options={{ preserveScroll: true }}
                >
                    {({ processing }) => (
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">
                                    Cancelar
                                </Button>
                            </DialogClose>

                            <Button
                                variant="destructive"
                                disabled={processing}
                                data-test="confirm-delete-procedure-type-button"
                            >
                                {processing && <Spinner />}
                                Eliminar
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

ProcedureTypeIndex.layout = {
    breadcrumbs: [{ title: 'Tipos de trámite', href: index() }],
};
