/**
 * Default: the page title (one per screen, in the display face).
 * Small: a section title inside a page, e.g. in settings.
 */
export default function Heading({
    title,
    description,
    variant = 'default',
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
}) {
    if (variant === 'small') {
        return (
            <header>
                <h2 className="mb-0.5 font-sans text-base font-semibold tracking-normal">
                    {title}
                </h2>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </header>
        );
    }

    return (
        <header className="space-y-1.5">
            <h1 className="text-2xl leading-tight font-bold md:text-3xl">
                {title}
            </h1>
            {description && (
                <p className="text-muted-foreground">{description}</p>
            )}
        </header>
    );
}
