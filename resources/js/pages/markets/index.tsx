import { Form, Head, Link } from '@inertiajs/react';
import { CalendarPlus, Pencil, Plus, Store } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import MarketController from '@/actions/App/Http/Controllers/MarketController';
import FormSelect from '@/components/form-select';
import Heading from '@/components/heading';
import StatusDot from '@/components/status-dot';
import InputError from '@/components/input-error';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { index, show } from '@/routes/markets';

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

const MONTHS = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Setiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
];

type MarketRow = {
    id: number;
    name: string;
    payment_frequency: 'anual' | 'mensual';
    address: string | null;
    is_active: boolean;
    stalls_count: number;
    active_stalls_count: number;
    debt: string;
};

/**
 * Municipal markets: stalls, debt and the monthly/yearly charge run.
 */
export default function MarketIndex({ markets }: { markets: MarketRow[] }) {
    return (
        <>
            <Head title="Mercados" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="-mx-4 -mt-4 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 md:-mx-6 md:-mt-6 md:px-6 md:py-6">
                    <Heading
                        title="Mercados"
                        description="Puestos, cuotas de alquiler y deuda de los comerciantes"
                    />
                    <MarketDialog
                        trigger={
                            <Button>
                                <Plus />
                                Nuevo mercado
                            </Button>
                        }
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {markets.map((market) => (
                        <section
                            key={market.id}
                            className="relative flex flex-col gap-4 rounded-xl border border-sidebar-border/70 p-5 transition-colors hover:bg-muted/30 dark:border-sidebar-border"
                        >
                            <StatusDot
                                active={market.is_active}
                                label={market.is_active ? 'Activo' : 'Inactivo'}
                            />
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="truncate font-semibold">
                                        {market.name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Cobro {market.payment_frequency}
                                        {!market.is_active && ' · inactivo'}
                                    </p>
                                </div>
                                <Store className="size-5 shrink-0 text-muted-foreground" />
                            </div>
                            <dl className="grid grid-cols-2 gap-2 text-sm">
                                <dt className="text-muted-foreground">
                                    Puestos
                                </dt>
                                <dd className="text-right tabular-nums">
                                    {market.active_stalls_count} /{' '}
                                    {market.stalls_count}
                                </dd>
                                <dt className="text-muted-foreground">Deuda</dt>
                                <dd className="text-right font-medium tabular-nums">
                                    {currency.format(Number(market.debt))}
                                </dd>
                            </dl>
                            <div className="mt-auto flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    asChild
                                >
                                    <Link href={show(market.id)}>
                                        Ver puestos
                                    </Link>
                                </Button>
                                <GenerateChargesDialog market={market} />
                                <MarketDialog
                                    market={market}
                                    trigger={
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            aria-label={`Editar ${market.name}`}
                                            title="Editar mercado"
                                        >
                                            <Pencil />
                                        </Button>
                                    }
                                />
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </>
    );
}

function MarketDialog({
    market,
    trigger,
}: {
    market?: MarketRow;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    {market ? `Editar ${market.name}` : 'Nuevo mercado'}
                </DialogTitle>
                <DialogDescription>
                    La frecuencia define si las cuotas son anuales o mensuales.
                </DialogDescription>
                <Form
                    noValidate
                    {...(market
                        ? MarketController.update.form(market.id)
                        : MarketController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={market?.name}
                                    aria-invalid={
                                        errors.name ? true : undefined
                                    }
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="payment_frequency">
                                    Frecuencia de cobro
                                </Label>
                                <FormSelect
                                    id="payment_frequency"
                                    name="payment_frequency"
                                    options={[
                                        { value: 'anual', label: 'Anual' },
                                        { value: 'mensual', label: 'Mensual' },
                                    ]}
                                    defaultValue={
                                        market?.payment_frequency ?? 'mensual'
                                    }
                                />
                                <InputError
                                    message={errors.payment_frequency}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input
                                    id="address"
                                    name="address"
                                    defaultValue={market?.address ?? ''}
                                />
                            </div>
                            <input
                                type="hidden"
                                name="is_active"
                                value={market?.is_active === false ? '0' : '1'}
                            />
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Guardar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function GenerateChargesDialog({ market }: { market: MarketRow }) {
    const [open, setOpen] = useState(false);
    const now = new Date();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" aria-label="Generar cuotas">
                    <CalendarPlus />
                    Cuotas
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Generar cuotas de {market.name}</DialogTitle>
                <DialogDescription>
                    Crea la cuota del período para cada puesto activo con cuota
                    registrada. Los puestos que ya la tienen no se duplican.
                </DialogDescription>
                <Form
                    noValidate
                    {...MarketController.generateCharges.form(market.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="year">Año</Label>
                                    <Input
                                        id="year"
                                        name="year"
                                        type="number"
                                        defaultValue={now.getFullYear()}
                                        aria-invalid={
                                            errors.year ? true : undefined
                                        }
                                    />
                                    <InputError message={errors.year} />
                                </div>
                                {market.payment_frequency === 'mensual' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="month">Mes</Label>
                                        <FormSelect
                                            id="month"
                                            name="month"
                                            options={MONTHS.map(
                                                (label, position) => ({
                                                    value: String(position + 1),
                                                    label,
                                                }),
                                            )}
                                            defaultValue={String(
                                                now.getMonth() + 1,
                                            )}
                                        />
                                        <InputError message={errors.month} />
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                        Cancelar
                                    </Button>
                                </DialogClose>
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Generar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

MarketIndex.layout = {
    breadcrumbs: [{ title: 'Mercados', href: index() }],
};
