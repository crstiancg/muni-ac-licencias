import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

/**
 * Server-side pagination controls for a Laravel paginator.
 * Query string filters are kept because the paginator uses withQueryString().
 */
export default function Pagination<T>({
    paginator,
    className,
}: {
    paginator: Paginated<T>;
    className?: string;
}) {
    if (paginator.total === 0) {
        return null;
    }

    // First and last links are "previous" / "next"; we render our own.
    const pages = paginator.links.slice(1, -1);

    return (
        <nav
            aria-label="Paginación"
            className={cn(
                'flex flex-col items-center justify-between gap-3 sm:flex-row',
                className,
            )}
        >
            <p className="text-sm text-muted-foreground">
                Mostrando {paginator.from}–{paginator.to} de {paginator.total}
            </p>

            {paginator.last_page > 1 && (
                <div className="flex items-center gap-1">
                    <PageButton
                        url={paginator.prev_page_url}
                        label="Página anterior"
                        wide
                    >
                        <ChevronLeft />
                        Anterior
                    </PageButton>

                    {/* Phones: compact indicator instead of page numbers. */}
                    <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
                        Página {paginator.current_page} de {paginator.last_page}
                    </span>

                    <div className="hidden items-center gap-1 sm:flex">
                        {pages.map((link, index) =>
                            link.url === null ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-2 text-sm text-muted-foreground"
                                >
                                    …
                                </span>
                            ) : (
                                <PageButton
                                    key={link.url}
                                    url={link.url}
                                    active={link.active}
                                    label={`Página ${link.label}`}
                                >
                                    {link.label}
                                </PageButton>
                            ),
                        )}
                    </div>

                    <PageButton
                        url={paginator.next_page_url}
                        label="Página siguiente"
                        wide
                    >
                        Siguiente
                        <ChevronRight />
                    </PageButton>
                </div>
            )}
        </nav>
    );
}

function PageButton({
    url,
    active = false,
    label,
    wide = false,
    children,
}: {
    url: string | null;
    active?: boolean;
    label: string;
    /** Previous/next: outlined button with text. */
    wide?: boolean;
    children: React.ReactNode;
}) {
    if (url === null) {
        return (
            <Button
                variant={wide ? 'outline' : 'ghost'}
                size={wide ? 'sm' : 'icon'}
                disabled
                aria-label={label}
            >
                {children}
            </Button>
        );
    }

    return (
        <Button
            variant={active ? 'default' : wide ? 'outline' : 'ghost'}
            size={wide ? 'sm' : 'icon'}
            asChild
            aria-label={label}
        >
            <Link
                href={url}
                preserveScroll
                preserveState
                aria-current={active ? 'page' : undefined}
            >
                {children}
            </Link>
        </Button>
    );
}
