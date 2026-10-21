import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Table header that toggles a Spatie Query Builder sort (`column` / `-column`).
 */
export default function SortableHeader({
    column,
    sort,
    onSort,
    align = 'left',
    children,
}: {
    column: string;
    sort: string;
    onSort: (sort: string) => void;
    align?: 'left' | 'right';
    children: ReactNode;
}) {
    const direction =
        sort === column ? 'asc' : sort === `-${column}` ? 'desc' : null;

    const Icon =
        direction === 'asc'
            ? ArrowUp
            : direction === 'desc'
              ? ArrowDown
              : ArrowUpDown;

    return (
        <th
            scope="col"
            aria-sort={
                direction === 'asc'
                    ? 'ascending'
                    : direction === 'desc'
                      ? 'descending'
                      : 'none'
            }
            className={cn(
                'px-4 py-3 font-medium',
                align === 'right' && 'text-right',
            )}
        >
            <button
                type="button"
                onClick={() =>
                    onSort(direction === 'asc' ? `-${column}` : column)
                }
                className={cn(
                    'inline-flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    direction && 'text-foreground',
                    align === 'right' && 'flex-row-reverse',
                )}
            >
                {children}
                <Icon className={cn('size-3.5', !direction && 'opacity-50')} />
            </button>
        </th>
    );
}
