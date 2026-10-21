import { Link, useFormContext } from '@inertiajs/react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import InputError from '@/components/input-error';
import TaxpayerPicker from '@/components/taxpayer-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { create as createEstablishment } from '@/routes/establishments';
import { create as createTaxpayer } from '@/routes/taxpayers';
import type {
    CurrentUit,
    Establishment,
    Procedure,
    ProcedureTypeOption,
    TaxpayerSummary,
} from '@/types';

type ProcedureFormData = {
    taxpayer_id: number;
    establishment_id: number;
    procedure_type_ids: number[];
    file_number: string;
    folios: number;
    notes: string;
};

const currency = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
});

/**
 * Registers who (taxpayer), where (one of their establishments) and what
 * (TUPA procedure types, with the fee for the current UIT).
 * Must be rendered inside an Inertia <Form noValidate> (Precognition).
 */
export default function ProcedureFormFields({
    procedure,
    taxpayer,
    establishmentId: initialEstablishmentId,
    procedureTypes,
    currentUit,
}: {
    procedure?: Procedure & { types?: { id: number }[] };
    taxpayer: TaxpayerSummary | null;
    /** Preselected establishment (e.g. a new procedure from a licence). */
    establishmentId?: number | null;
    procedureTypes: ProcedureTypeOption[];
    currentUit: CurrentUit;
}) {
    const form = useFormContext<ProcedureFormData>();
    const [owner, setOwner] = useState(taxpayer);
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [loading, setLoading] = useState(false);
    const [establishmentId, setEstablishmentId] = useState(
        procedure?.establishment_id ?? initialEstablishmentId ?? null,
    );
    const [typeIds, setTypeIds] = useState<number[]>(
        procedure?.types?.map((type) => type.id) ?? [],
    );

    const loadEstablishments = useCallback((taxpayerId: number) => {
        setLoading(true);
        fetch(TaxpayerController.establishments.url(taxpayerId), {
            headers: { Accept: 'application/json' },
        })
            .then((response) => (response.ok ? response.json() : []))
            .then((list: Establishment[]) => {
                setEstablishments(list);
                // A single establishment is the obvious choice.
                if (list.length === 1) {
                    setEstablishmentId(list[0].id);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (taxpayer) {
            loadEstablishments(taxpayer.id);
        }
    }, [taxpayer, loadEstablishments]);

    const total = procedureTypes
        .filter((type) => typeIds.includes(type.id))
        .reduce((sum, type) => sum + Number(type.fee ?? 0), 0);

    function toggleType(id: number, checked: boolean) {
        setTypeIds((current) =>
            checked
                ? [...current, id]
                : current.filter((value) => value !== id),
        );
    }

    return (
        <>
            <Section title="1. Contribuyente">
                <TaxpayerPicker
                    name="taxpayer_id"
                    initial={taxpayer}
                    invalid={!!form?.errors.taxpayer_id}
                    onChange={(selected) => {
                        setOwner(selected);
                        setEstablishments([]);
                        setEstablishmentId(null);

                        if (selected) {
                            loadEstablishments(selected.id);
                        }
                    }}
                />
                <InputError message={form?.errors.taxpayer_id} />
                {!owner && (
                    <p className="text-sm text-muted-foreground">
                        ¿No está registrado?{' '}
                        <Link
                            href={createTaxpayer()}
                            className="underline underline-offset-4"
                        >
                            Registrar contribuyente
                        </Link>
                    </p>
                )}
            </Section>

            <Section title="2. Establecimiento">
                <input
                    type="hidden"
                    name="establishment_id"
                    value={establishmentId ?? ''}
                />

                {!owner ? (
                    <p className="text-sm text-muted-foreground">
                        Primero elige al contribuyente.
                    </p>
                ) : loading ? (
                    <Spinner />
                ) : (
                    <>
                        {establishments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {owner.name} no tiene establecimientos
                                registrados.
                            </p>
                        ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                                {establishments.map((establishment) => (
                                    <button
                                        key={establishment.id}
                                        type="button"
                                        onClick={() =>
                                            setEstablishmentId(establishment.id)
                                        }
                                        aria-pressed={
                                            establishmentId === establishment.id
                                        }
                                        className={cn(
                                            'rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent',
                                            establishmentId ===
                                                establishment.id &&
                                                'border-primary bg-accent ring-1 ring-primary',
                                        )}
                                    >
                                        <div className="font-medium">
                                            {establishment.trade_name ??
                                                establishment.activity}
                                        </div>
                                        {establishment.trade_name && (
                                            <div>{establishment.activity}</div>
                                        )}
                                        <div className="text-muted-foreground">
                                            {establishment.full_address}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" asChild>
                                <a
                                    href={
                                        createEstablishment({
                                            query: { taxpayer: owner.id },
                                        }).url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <ExternalLink />
                                    Nuevo establecimiento
                                </a>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => loadEstablishments(owner.id)}
                            >
                                <RefreshCw />
                                Actualizar lista
                            </Button>
                        </div>
                    </>
                )}
                <InputError message={form?.errors.establishment_id} />
            </Section>

            <Section title="3. Tipos de trámite">
                <div className="divide-y rounded-lg border">
                    {procedureTypes.map((type) => (
                        <label
                            key={type.id}
                            className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-accent/50"
                        >
                            <input
                                type="checkbox"
                                name="procedure_type_ids[]"
                                value={type.id}
                                checked={typeIds.includes(type.id)}
                                onChange={(event) =>
                                    toggleType(type.id, event.target.checked)
                                }
                                className="mt-0.5 size-4 accent-primary"
                            />
                            <span className="flex-1">
                                {type.tupa_code && (
                                    <span className="mr-1 text-muted-foreground">
                                        {type.tupa_code}
                                    </span>
                                )}
                                {type.name}
                            </span>
                            <span className="whitespace-nowrap tabular-nums">
                                {type.fee === null
                                    ? '—'
                                    : Number(type.fee) === 0
                                      ? 'Gratuito'
                                      : currency.format(Number(type.fee))}
                            </span>
                        </label>
                    ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        {currentUit
                            ? `Referencial con la UIT ${currentUit.year}. El monto se fija al emitir la orden de pago.`
                            : 'Falta registrar la UIT del año para calcular montos.'}
                    </span>
                    <span className="font-semibold tabular-nums">
                        Total {currency.format(total)}
                    </span>
                </div>
                <InputError
                    message={
                        form?.errors.procedure_type_ids ??
                        Object.entries(form?.errors ?? {}).find(([key]) =>
                            key.startsWith('procedure_type_ids.'),
                        )?.[1]
                    }
                />
            </Section>

            <Section title="4. Mesa de partes">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="file_number">N° de expediente</Label>
                        <Input
                            id="file_number"
                            name="file_number"
                            defaultValue={procedure?.file_number ?? ''}
                            onBlur={() => form?.validate('file_number')}
                            aria-invalid={
                                form?.errors.file_number ? true : undefined
                            }
                        />
                        <InputError message={form?.errors.file_number} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="folios">Folios</Label>
                        <Input
                            id="folios"
                            type="number"
                            name="folios"
                            inputMode="numeric"
                            defaultValue={procedure?.folios ?? ''}
                            onBlur={() => form?.validate('folios')}
                            aria-invalid={
                                form?.errors.folios ? true : undefined
                            }
                        />
                        <InputError message={form?.errors.folios} />
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="notes">Observaciones</Label>
                    <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        defaultValue={procedure?.notes ?? ''}
                        onBlur={() => form?.validate('notes')}
                        aria-invalid={form?.errors.notes ? true : undefined}
                        className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
                    />
                    <InputError message={form?.errors.notes} />
                </div>
            </Section>
        </>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">{title}</legend>
            {children}
        </fieldset>
    );
}
