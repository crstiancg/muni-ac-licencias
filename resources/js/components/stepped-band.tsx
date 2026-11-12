import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Andean stepped band in the gold of the coat of arms: this system's
 * signature, used as a divider (never as a background).
 */
export default function SteppedBand({ className }: { className?: string }) {
    // React ids contain characters that break url(#…) references.
    const id = `stepped-band-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

    return (
        <svg aria-hidden="true" className={cn('block h-3 w-full', className)}>
            <defs>
                <pattern
                    id={id}
                    width="32"
                    height="12"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M0 12V8h5V4h5V1h12v3h5v4h5v4"
                        fill="none"
                        stroke="var(--gold)"
                        strokeWidth="1.6"
                    />
                </pattern>
            </defs>
            <rect width="100%" height="12" fill={`url(#${id})`} />
        </svg>
    );
}
