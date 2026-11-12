import { usePage } from '@inertiajs/react';
import MunicipalCrest from '@/components/municipal-crest';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <MunicipalCrest className="aspect-square size-8 rounded-md p-0.5" />
            <div className="ml-1 grid flex-1 text-left">
                <span className="truncate font-display text-base leading-tight font-bold">
                    {name}
                </span>
                <span className="truncate text-xs leading-tight text-sidebar-foreground/70">
                    Municipalidad Provincial de Puno
                </span>
            </div>
        </>
    );
}
