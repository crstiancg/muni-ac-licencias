import { Search } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Debounced search input. Only `value` re-triggers the effect; `onSearch` is
 * an Effect Event so it always sees the latest filters (e.g. current sort).
 */
export default function SearchInput({
    initial,
    onSearch,
    placeholder,
    label,
}: {
    initial: string;
    onSearch: (search: string) => void;
    placeholder: string;
    label: string;
}) {
    const [value, setValue] = useState(initial);
    const firstRender = useRef(true);
    const search = useEffectEvent(onSearch);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;

            return;
        }

        const timeout = setTimeout(() => search(value.trim()), 300);

        return () => clearTimeout(timeout);
    }, [value]);

    return (
        <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                aria-label={label}
                className="pl-9"
            />
        </div>
    );
}
