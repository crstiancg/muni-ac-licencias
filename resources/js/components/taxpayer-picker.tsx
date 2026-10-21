import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import TaxpayerController from '@/actions/App/Http/Controllers/TaxpayerController';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TaxpayerSummary } from '@/types';

/**
 * Searches registered taxpayers (document, RUC or name) and submits the chosen
 * one's id as `name`. Reusable wherever a taxpayer must be chosen.
 */
export default function TaxpayerPicker({
    name,
    initial,
    invalid,
    onChange,
}: {
    name: string;
    initial?: TaxpayerSummary | null;
    invalid?: boolean;
    onChange?: (taxpayer: TaxpayerSummary | null) => void;
}) {
    const [selected, setSelected] = useState(initial ?? null);
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<TaxpayerSummary[]>([]);

    useEffect(() => {
        if (term.trim().length < 2) {
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            fetch(
                TaxpayerController.search.url({ query: { q: term.trim() } }),
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            )
                .then((response) => (response.ok ? response.json() : []))
                .then(setResults)
                .catch(() => {});
        }, 300);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [term]);

    function choose(taxpayer: TaxpayerSummary | null) {
        setSelected(taxpayer);
        setTerm('');
        setResults([]);
        onChange?.(taxpayer);
    }

    if (selected) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <input type="hidden" name={name} value={selected.id} />
                <div className="min-w-0">
                    <div className="truncate font-medium">{selected.name}</div>
                    <div className="text-xs text-muted-foreground">
                        {selected.document_type.toUpperCase()}{' '}
                        {selected.document_number}
                        {selected.ruc && ` · RUC ${selected.ruc}`}
                    </div>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Cambiar contribuyente"
                    onClick={() => choose(null)}
                >
                    <X />
                </Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <input type="hidden" name={name} value="" />
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={term}
                onChange={(event) => {
                    setTerm(event.target.value);
                    if (event.target.value.trim().length < 2) {
                        setResults([]);
                    }
                }}
                placeholder="Buscar por DNI, RUC o nombre"
                aria-label="Buscar contribuyente"
                aria-invalid={invalid ? true : undefined}
                className="pl-9"
            />

            {results.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {results.map((taxpayer) => (
                        <li key={taxpayer.id}>
                            <button
                                type="button"
                                onClick={() => choose(taxpayer)}
                                className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                                <div className="font-medium">
                                    {taxpayer.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {taxpayer.document_type.toUpperCase()}{' '}
                                    {taxpayer.document_number}
                                    {taxpayer.ruc && ` · RUC ${taxpayer.ruc}`}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
