import { router } from '@inertiajs/react';
import { QrCode } from 'lucide-react';
import QrScanner from 'qr-scanner';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { scan } from '@/routes/inspections';

/**
 * Reads a licence QR with the phone's rear camera and opens its visit
 * form. Uses the browser's native detector when there is one, otherwise
 * qr-scanner's own worker (iPhone included). Needs HTTPS.
 */
export default function QrScanDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="h-14 flex-1 text-base">
                    <QrCode className="size-5" />
                    Escanear QR
                </Button>
            </DialogTrigger>
            <DialogContent className="gap-3 p-4 sm:max-w-md">
                <DialogTitle>Escanear QR de la licencia</DialogTitle>
                <DialogDescription>
                    Apunta al código QR impreso en la licencia. Las licencias
                    del sistema anterior no lo tienen: búscalas por RUC, nombre
                    o dirección.
                </DialogDescription>
                {open && <Scanner onRead={() => setOpen(false)} />}
            </DialogContent>
        </Dialog>
    );
}

function Scanner({ onRead }: { onRead: () => void }) {
    const video = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!video.current) {
            return;
        }

        let done = false;
        const scanner = new QrScanner(
            video.current,
            (result) => {
                if (done) {
                    return;
                }

                done = true;
                scanner.stop();
                onRead();
                router.visit(scan({ query: { code: result.data } }));
            },
            {
                preferredCamera: 'environment',
                highlightScanRegion: true,
                highlightCodeOutline: true,
                returnDetailedScanResult: true,
            },
        );

        scanner
            .start()
            .catch(() =>
                setError(
                    'No se pudo abrir la cámara. Revisa que el navegador tenga permiso para usarla.',
                ),
            );

        return () => {
            done = true;
            scanner.destroy();
        };
    }, [onRead]);

    return error ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
        </p>
    ) : (
        <div className="overflow-hidden rounded-xl bg-black">
            {/* muted + playsInline: iOS only autoplays inline, silent video. */}
            <video
                ref={video}
                muted
                playsInline
                className="aspect-square w-full object-cover"
            />
        </div>
    );
}
