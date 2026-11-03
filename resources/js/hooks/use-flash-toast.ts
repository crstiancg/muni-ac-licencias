import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            // A document to print right away (e.g. the sworn declaration
            // after registering a procedure). The page keeps a button in
            // case the browser blocks the new tab.
            if (typeof flash?.open === 'string') {
                window.open(flash.open, '_blank');
            }

            if (!data) {
                return;
            }

            toast[data.type](data.message);
        });
    }, []);
}
