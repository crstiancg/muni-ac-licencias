import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import LicenseStatusBadge from '@/components/license-status-badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LicenseStatusValue } from '@/types';

type LicenseOption = {
    id: number;
    number: string;
    holder_name: string;
    address: string;
    activity: string;
    type_label: string;
    status: LicenseStatusValue;
    status_label: string;
};

/**
 * Picks the existing licence a procedure acts on (replace, close,
 * duplicate). Starts with the taxpayer's licences in force; searching finds
 * any other (e.g. the previous owner's in a transfer). Submits `name`.
 */
export default function LicensePicker({
    name,
    taxpayerId,
    error,
}: {
    name: string;
    taxpayerId: number;
    error?: string;
}) {
    const [term, setTerm] = useState('');
    const [options, setOptions] = useState<LicenseOption[]>([]);
    const [selected, setSelected] = useState<number | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const timeout = setTimeout(
            () =>
                fetch(
                    LicenseController.search.url({
                        query: { q: term.trim(), taxpayer: taxpayerId },
                    }),
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                )
                    .then((response) => (response.ok ? response.json() : []))
                    .then((list: LicenseOption[]) => {
                        setOptions(list);
                        // The usual case: the taxpayer has a single licence.
                        if (term.trim() === '' && list.length === 1) {
                            setSelected(list[0].id);
                        }
                    })
                    .catch(() => {}),
            term ? 300 : 0,
        );

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [term, taxpayerId]);

    return (
        <div className="space-y-2">
            <input type="hidden" name={name} value={selected ?? ''} />
            <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Buscar otra licencia: N°, titular o dirección"
                    aria-label="Buscar licencia"
                    className="pl-9"
                />
            </div>
            <div className="max-h-60 space-y-1 overflow-y-auto">
                {options.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelected(option.id)}
                        aria-pressed={selected === option.id}
                        className={cn(
                            'flex w-full items-start justify-between gap-2 rounded-md border p-2 text-left text-sm hover:bg-accent',
                            selected === option.id &&
                                'border-primary bg-accent ring-1 ring-primary',
                        )}
                    >
                        <span className="min-w-0">
                            <span className="block font-medium tabular-nums">
                                {option.number}{' '}
                                <span className="font-normal text-muted-foreground">
                                    {option.type_label}
                                </span>
                            </span>
                            <span className="block truncate">
                                {option.holder_name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                                {option.activity} · {option.address}
                            </span>
                        </span>
                        <LicenseStatusBadge
                            status={option.status}
                            label={option.status_label}
                        />
                    </button>
                ))}
                {options.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        {term
                            ? 'Ninguna licencia coincide.'
                            : 'El contribuyente no tiene licencias vigentes. Busca la licencia afectada.'}
                    </p>
                )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
