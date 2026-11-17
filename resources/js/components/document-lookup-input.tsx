import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import { WizardField } from '@/components/procedure-wizard/wizard-field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { DocumentLookupResult } from '@/types';

export type OfficialData = Extract<
    DocumentLookupResult,
    { source: 'reniec' | 'sunat' }
>['data'];

type Lookup =
    | { status: 'idle' | 'loading' }
    | { status: 'done'; message: string; warning: boolean };

/** Digits a document needs before it can be asked online. */
const LENGTH = { dni: 8, ruc: 11 } as const;

/**
 * Document number with a RENIEC/SUNAT search inside the field: the
 * magnifier, Enter, or typing the last digit asks for the official data
 * (never the taxpayer's file) and hands it to onFound. A CE cannot be asked
 * online, so the search hides.
 */
export default function DocumentLookupInput({
    id,
    label,
    value,
    onChange,
    documentType,
    onFound,
    error,
    className,
    name,
    onBlur,
}: {
    id: string;
    /** For forms that submit the inputs themselves (Inertia <Form>). */
    name?: string;
    onBlur?: () => void;
    label: string;
    value: string;
    onChange: (value: string) => void;
    /** dni, ruc or ce. */
    documentType: string;
    onFound: (data: OfficialData) => void;
    error?: string;
    className?: string;
}) {
    const [lookup, setLookup] = useState<Lookup>({ status: 'idle' });
    // Only the last query may answer: typing on cancels an older one.
    const latest = useRef(0);
    const length =
        documentType === 'dni' || documentType === 'ruc'
            ? LENGTH[documentType]
            : null;
    const ready =
        length !== null && new RegExp(`^\\d{${length}}$`).test(value.trim());

    async function search(number = value.trim()) {
        if (length === null || !new RegExp(`^\\d{${length}}$`).test(number)) {
            return;
        }

        const query = ++latest.current;
        setLookup({ status: 'loading' });

        const response = await fetch(
            TaxpayerController.lookup.url({
                query: { document_type: documentType, number, remote: 1 },
            }),
            { headers: { Accept: 'application/json' } },
        ).catch(() => null);
        const body = await response?.json().catch(() => null);

        if (query !== latest.current) {
            return;
        }

        if (!response?.ok) {
            setLookup({
                status: 'done',
                warning: true,
                message:
                    body?.errors?.number?.[0] ??
                    body?.message ??
                    'No se pudo consultar. Completa los datos a mano.',
            });

            return;
        }

        const { data, source } = body as Extract<
            DocumentLookupResult,
            { source: 'reniec' | 'sunat' }
        >;
        const inactive =
            source === 'sunat' &&
            (data.sunat_status !== 'ACTIVO' ||
                data.sunat_condition !== 'HABIDO');

        onFound(data);
        setLookup({
            status: 'done',
            warning: inactive,
            message:
                source === 'sunat'
                    ? `Datos de SUNAT: ${data.sunat_status ?? '—'} / ${data.sunat_condition ?? '—'}`
                    : 'Datos de RENIEC.',
        });
    }

    return (
        <WizardField id={id} label={label} error={error} className={className}>
            <div className="relative">
                <Input
                    id={id}
                    name={name}
                    value={value}
                    onBlur={onBlur}
                    inputMode={documentType === 'ce' ? 'text' : 'numeric'}
                    aria-invalid={error ? true : undefined}
                    className={length !== null ? 'pr-10' : undefined}
                    onChange={(event) => {
                        const typed = event.target.value;
                        onChange(typed);
                        latest.current++;
                        setLookup({ status: 'idle' });

                        // The last digit asks on its own.
                        if (length !== null && typed.trim().length === length) {
                            void search(typed.trim());
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            void search();
                        }
                    }}
                />
                {length !== null && (
                    <button
                        type="button"
                        title={`Buscar en ${documentType === 'ruc' ? 'SUNAT' : 'RENIEC'}`}
                        aria-label={`Buscar en ${documentType === 'ruc' ? 'SUNAT' : 'RENIEC'}`}
                        onClick={() => void search()}
                        disabled={!ready || lookup.status === 'loading'}
                        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-link disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4"
                    >
                        {lookup.status === 'loading' ? <Spinner /> : <Search />}
                    </button>
                )}
            </div>
            {lookup.status === 'done' && (
                <p
                    className={
                        lookup.warning
                            ? 'text-xs text-amber-600 dark:text-amber-400'
                            : 'text-xs text-muted-foreground'
                    }
                >
                    {lookup.message}
                </p>
            )}
        </WizardField>
    );
}
