import { cn } from '@/lib/utils';

/**
 * The coat of arms of the Municipalidad Provincial de Puno on its warm
 * paper tile: the institutional mark shared by every system of the entity.
 * Decorative next to the system name, so its alt is empty by default.
 */
export default function MunicipalCrest({
    className,
    alt = '',
}: {
    className?: string;
    alt?: string;
}) {
    return (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-lg bg-[#f4efe2] p-1',
                className,
            )}
        >
            <img
                src="/images/escudo.png"
                alt={alt}
                className="size-full object-contain"
            />
        </span>
    );
}
