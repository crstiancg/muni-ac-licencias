import { Form, Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import UitController from '@/actions/App/Http/Controllers/UitController';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import UitFormDialog from '@/components/uit-form-dialog';
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
import { index } from '@/routes/uits';
import type { Paginated, Uit } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const DEFAULT_SORT = '-year';

type Filters = { search: string | null; sort: string };

/**
 * Reloads the list with Spatie Query Builder params
 * (?filter[search]=&sort=), back on page 1. Defaults are left out of the URL.
 */
function visit({ search, sort }: Filters) {
    router.get(
        index().url,
        {
            ...(search ? { filter: { search } } : {}),
            ...(sort !== DEFAULT_SORT ? { sort } : {}),
        },
        {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['uits', 'filters'],
        },
    );
}

export default function UitIndex({
    uits,
    filters,
    currentYear,
}: {
    uits: Paginated<Uit>;
    filters: Filters;
    currentYear: number;
}) {
    const sortBy = (sort: string) => visit({ ...filters, sort });

    return (
        <>
            <Head title="UIT" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Unidad Impositiva Tributaria"
                        description="Valor de la UIT por año, usado para calcular los derechos de trámite"
                    />

                    <UitFormDialog
                        trigger={
                            <Button data-test="create-uit-button">
                                <Plus />
                                Registrar UIT
                            </Button>
                        }
                    />
                </div>

                <SearchInput
                    initial={filters.search ?? ''}
                    placeholder="Buscar por año o base legal"
                    label="Buscar UIT"
                    onSearch={(search) =>
                        visit({ ...filters, search: search || null })
                    }
                />

                {uits.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        {filters.search
                            ? `No hay UIT que coincidan con “${filters.search}”.`
                            : 'Aún no hay UIT registradas.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-muted-foreground">
                                <tr>
                                    <SortableHeader
                                        column="year"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Año
                                    </SortableHeader>
                                    <SortableHeader
                                        column="amount"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                        align="right"
                                    >
                                        Valor
                                    </SortableHeader>
                                    <th className="px-4 py-3 font-medium">
                                        Base legal
                                    </th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">
                                            Acciones
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {uits.data.map((uit) => (
                                    <tr
                                        key={uit.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            <span className="flex items-center gap-2">
                                                {uit.year}
                                                {uit.year === currentYear && (
                                                    <Badge>Vigente</Badge>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {currency.format(
                                                Number(uit.amount),
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {uit.legal_basis ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <UitFormDialog
                                                    uit={uit}
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Editar UIT ${uit.year}`}
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                    }
                                                />

                                                <DeleteUit uit={uit} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={uits} />
            </div>
        </>
    );
}

function DeleteUit({ uit }: { uit: Uit }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar UIT ${uit.year}`}
                >
                    <Trash2 className="text-red-600 dark:text-red-400" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>¿Eliminar la UIT {uit.year}?</DialogTitle>
                <DialogDescription>
                    Se eliminará el valor de{' '}
                    {currency.format(Number(uit.amount))} registrado para{' '}
                    {uit.year}. Esta acción no se puede deshacer.
                </DialogDescription>

                <Form
                    noValidate
                    {...UitController.destroy.form(uit.id)}
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
                                data-test="confirm-delete-uit-button"
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

UitIndex.layout = {
    breadcrumbs: [{ title: 'UIT', href: index() }],
};
