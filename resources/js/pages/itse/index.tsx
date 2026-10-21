import { Form, Head, Link, router } from '@inertiajs/react';
import { Ban, Plus } from 'lucide-react';
import ItseCertificateController from '@/actions/App/Http/Controllers/ItseCertificateController';
import FormSelect from '@/components/form-select';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import ItseStatusBadge from '@/components/itse-status-badge';
import type { ItseState } from '@/components/itse-status-badge';
import Pagination from '@/components/pagination';
import SearchInput from '@/components/search-input';
import SortableHeader from '@/components/sortable-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { create, index } from '@/routes/itse';
import { show as showTaxpayer } from '@/routes/taxpayers';
import type { Paginated } from '@/types';

const DEFAULT_SORT = 'valid_until';

const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });

const formatDate = (value: string) =>
    date.format(new Date(`${value.slice(0, 10)}T12:00:00`));

type CertificateRow = {
    id: number;
    number: string;
    issued_at: string;
    valid_until: string;
    inspection_timing: 'previa' | 'posterior';
    status_reason: string | null;
    risk_label: string;
    state: ItseState;
    state_label: string;
    establishment: { id: number; activity: string; address: string };
    taxpayer: { id: number; name: string };
};

type Filters = { search: string | null; state: string | null; sort: string };

function visit({ search, state, sort }: Filters) {
    const filter = {
        ...(search ? { search } : {}),
        ...(state ? { state } : {}),
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
            only: ['certificates', 'filters'],
        },
    );
}

/**
 * ITSE certificates of the establishments, soonest to expire first, so the
 * office can warn owners before the 2 years run out.
 */
export default function ItseIndex({
    certificates,
    filters,
    counts,
}: {
    certificates: Paginated<CertificateRow>;
    filters: Filters;
    counts: { por_vencer: number; vencido: number };
}) {
    return (
        <>
            <Head title="ITSE" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Certificados ITSE"
                        description={`Inspección Técnica de Seguridad en Edificaciones · vigencia de 2 años · ${counts.por_vencer} por vencer, ${counts.vencido} vencidos`}
                    />
                    <Button asChild>
                        <Link href={create()}>
                            <Plus />
                            Registrar ITSE
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SearchInput
                        initial={filters.search ?? ''}
                        placeholder="N° de certificado, giro, dirección o contribuyente"
                        label="Buscar ITSE"
                        onSearch={(search) =>
                            visit({ ...filters, search: search || null })
                        }
                    />
                    <div className="w-52">
                        <FormSelect
                            id="state"
                            name="state"
                            options={[
                                { value: 'vigente', label: 'Vigentes' },
                                { value: 'por_vencer', label: 'Por vencer' },
                                { value: 'vencido', label: 'Vencidos' },
                                { value: 'revocado', label: 'Revocados' },
                            ]}
                            defaultValue={filters.state}
                            emptyLabel="Todos los estados"
                            onValueChange={(state) =>
                                visit({ ...filters, state: state || null })
                            }
                        />
                    </div>
                </div>

                {certificates.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        No hay certificados con esos filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left text-foreground">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Certificado
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Establecimiento
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Riesgo
                                    </th>
                                    <SortableHeader
                                        column="valid_until"
                                        sort={filters.sort}
                                        onSort={(sort) =>
                                            visit({ ...filters, sort })
                                        }
                                    >
                                        Vence
                                    </SortableHeader>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">
                                            Acciones
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {certificates.data.map((certificate) => (
                                    <tr
                                        key={certificate.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="font-medium tabular-nums">
                                                {certificate.number}
                                            </div>
                                            <ItseStatusBadge
                                                state={certificate.state}
                                                label={certificate.state_label}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={showTaxpayer(
                                                    certificate.taxpayer.id,
                                                )}
                                                className={buttonVariants({
                                                    variant: 'outline',
                                                    size: 'sm',
                                                })}
                                            >
                                                {certificate.taxpayer.name}
                                            </Link>
                                            <div className="text-xs text-muted-foreground">
                                                {
                                                    certificate.establishment
                                                        .activity
                                                }{' '}
                                                ·{' '}
                                                {
                                                    certificate.establishment
                                                        .address
                                                }
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {certificate.risk_label}
                                            <div className="text-xs text-muted-foreground">
                                                ITSE{' '}
                                                {certificate.inspection_timing}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {formatDate(
                                                certificate.valid_until,
                                            )}
                                            <div className="text-xs text-muted-foreground">
                                                Emitido{' '}
                                                {formatDate(
                                                    certificate.issued_at,
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {certificate.state !==
                                                'revocado' && (
                                                <RevokeCertificate
                                                    certificate={certificate}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination paginator={certificates} />
            </div>
        </>
    );
}

function RevokeCertificate({ certificate }: { certificate: CertificateRow }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Revocar ITSE ${certificate.number}`}
                >
                    <Ban className="text-red-600 dark:text-red-400" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    ¿Revocar el ITSE {certificate.number}?
                </DialogTitle>
                <DialogDescription>
                    El establecimiento quedará sin ITSE vigente. Indica el
                    motivo (p. ej. inspección posterior desfavorable).
                </DialogDescription>
                <Form
                    noValidate
                    {...ItseCertificateController.revoke.form(certificate.id)}
                    options={{ preserveScroll: true }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="reason">Motivo</Label>
                                <textarea
                                    id="reason"
                                    name="reason"
                                    rows={3}
                                    aria-invalid={
                                        errors.reason ? true : undefined
                                    }
                                    className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
                                />
                                <InputError message={errors.reason} />
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Revocar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

ItseIndex.layout = {
    breadcrumbs: [{ title: 'ITSE', href: index() }],
};
