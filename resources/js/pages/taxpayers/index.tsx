import { Form, Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import Heading from '@/components/heading';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import TaxpayerFormDialog from '@/components/taxpayer-form-dialog';
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
import { index } from '@/routes/taxpayers';
import type { DocumentTypeOption, Paginated, Taxpayer } from '@/types';

const DEFAULT_SORT = 'name';

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
            only: ['taxpayers', 'filters'],
        },
    );
}

export default function TaxpayerIndex({
    taxpayers,
    filters,
    documentTypes,
}: {
    taxpayers: Paginated<Taxpayer>;
    filters: Filters;
    documentTypes: DocumentTypeOption[];
}) {
    const sortBy = (sort: string) => visit({ ...filters, sort });
    const typeLabel = (value: Taxpayer['document_type']) =>
        value === 'ce'
            ? 'CE'
            : documentTypes.find((type) => type.value === value)?.label;

    return (
        <>
            <Head title="Contribuyentes" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Contribuyentes"
                        description="Personas naturales y jurídicas que solicitan trámites"
                    />

                    <TaxpayerFormDialog
                        documentTypes={documentTypes}
                        trigger={
                            <Button data-test="create-taxpayer-button">
                                <Plus />
                                Registrar contribuyente
                            </Button>
                        }
                    />
                </div>

                <SearchInput
                    initial={filters.search ?? ''}
                    placeholder="Buscar por DNI, RUC o nombre"
                    label="Buscar contribuyente"
                    onSearch={(search) =>
                        visit({ ...filters, search: search || null })
                    }
                />

                {taxpayers.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        {filters.search
                            ? `No hay contribuyentes que coincidan con “${filters.search}”.`
                            : 'Aún no hay contribuyentes registrados.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-muted-foreground">
                                <tr>
                                    <SortableHeader
                                        column="document_number"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Documento
                                    </SortableHeader>
                                    <SortableHeader
                                        column="name"
                                        sort={filters.sort}
                                        onSort={sortBy}
                                    >
                                        Nombre o razón social
                                    </SortableHeader>
                                    <th className="px-4 py-3 font-medium">
                                        Domicilio fiscal
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Teléfono
                                    </th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">
                                            Acciones
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {taxpayers.data.map((taxpayer) => (
                                    <tr
                                        key={taxpayer.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                                            <div>
                                                <span className="mr-1 text-muted-foreground">
                                                    {typeLabel(
                                                        taxpayer.document_type,
                                                    )}
                                                </span>
                                                {taxpayer.document_number}
                                            </div>
                                            {taxpayer.ruc && (
                                                <div className="text-xs text-muted-foreground">
                                                    RUC {taxpayer.ruc}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">
                                                {taxpayer.name}
                                            </div>
                                            {taxpayer.document_type === 'ruc' &&
                                                taxpayer.document_number.startsWith(
                                                    '20',
                                                ) && (
                                                    <Badge
                                                        variant="outline"
                                                        className="mt-1"
                                                    >
                                                        Persona jurídica
                                                    </Badge>
                                                )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {taxpayer.address ?? '—'}
                                            {taxpayer.district &&
                                                ` · ${taxpayer.district}`}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {taxpayer.phone ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <TaxpayerFormDialog
                                                    taxpayer={taxpayer}
                                                    documentTypes={
                                                        documentTypes
                                                    }
                                                    trigger={
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label={`Editar ${taxpayer.name}`}
                                                        >
                                                            <Pencil />
                                                        </Button>
                                                    }
                                                />

                                                <DeleteTaxpayer
                                                    taxpayer={taxpayer}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={taxpayers} />
            </div>
        </>
    );
}

function DeleteTaxpayer({ taxpayer }: { taxpayer: Taxpayer }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Eliminar ${taxpayer.name}`}
                >
                    <Trash2 className="text-red-600 dark:text-red-400" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>¿Eliminar este contribuyente?</DialogTitle>
                <DialogDescription>
                    Se eliminará a {taxpayer.name} ({taxpayer.document_number}).
                    Esta acción no se puede deshacer.
                </DialogDescription>

                <Form
                    noValidate
                    {...TaxpayerController.destroy.form(taxpayer.id)}
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
                                data-test="confirm-delete-taxpayer-button"
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

TaxpayerIndex.layout = {
    breadcrumbs: [{ title: 'Contribuyentes', href: index() }],
};
