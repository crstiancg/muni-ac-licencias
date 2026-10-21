import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import UitController from '@/actions/App/Http/Controllers/UitController';
import Heading from '@/components/heading';
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
import { create, edit, index } from '@/routes/uits';
import type { Uit } from '@/types';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

export default function UitIndex({
    uits,
    currentYear,
}: {
    uits: Uit[];
    currentYear: number;
}) {
    return (
        <>
            <Head title="UIT" />

            <div className="flex flex-col gap-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Unidad Impositiva Tributaria"
                        description="Valor de la UIT por año, usado para calcular los derechos de trámite"
                    />

                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Registrar UIT
                        </Link>
                    </Button>
                </div>

                {uits.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        Aún no hay UIT registradas.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Año
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Valor
                                    </th>
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
                                {uits.map((uit) => (
                                    <tr key={uit.id}>
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    asChild
                                                >
                                                    <Link
                                                        href={edit(uit.id)}
                                                        aria-label={`Editar UIT ${uit.year}`}
                                                    >
                                                        <Pencil />
                                                    </Link>
                                                </Button>

                                                <DeleteUit uit={uit} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
                    {...UitController.destroy.form(uit.id)}
                    options={{ preserveScroll: true }}
                >
                    {({ processing }) => (
                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button variant="secondary">Cancelar</Button>
                            </DialogClose>

                            <Button
                                variant="destructive"
                                disabled={processing}
                                data-test="confirm-delete-uit-button"
                            >
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
