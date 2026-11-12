import { Link, usePage } from '@inertiajs/react';
import { BadgeCheck, Receipt, ShieldCheck, Warehouse } from 'lucide-react';
import MunicipalCrest from '@/components/municipal-crest';
import SteppedBand from '@/components/stepped-band';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const modules = [
    { icon: BadgeCheck, label: 'Licencias de funcionamiento con QR' },
    { icon: ShieldCheck, label: 'Certificados ITSE y su vigencia' },
    { icon: Receipt, label: 'Órdenes de pago y Caja' },
    { icon: Warehouse, label: 'Puestos y cuotas de mercados' },
];

/**
 * Login and account screens: institutional panel on the left, form on the
 * right. On small screens only the form, with the logo on top.
 */
export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
                <Link
                    href={home()}
                    className="relative flex items-center gap-3"
                >
                    <MunicipalCrest className="size-12" />
                    <span className="grid leading-tight">
                        <span className="font-display text-xl font-bold text-white">
                            {name}
                        </span>
                        <span className="text-sm opacity-75">
                            Municipalidad Provincial de Puno
                        </span>
                    </span>
                </Link>

                <div className="relative space-y-6">
                    <SteppedBand className="max-w-md" />
                    <h2 className="max-w-md text-4xl leading-tight font-bold text-white">
                        Trámites, licencias y cobros en un solo lugar.
                    </h2>
                    <ul className="space-y-3">
                        {modules.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent text-gold">
                                    <Icon className="size-4" />
                                </span>
                                <span className="text-sm">{label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs opacity-60">
                    Uso exclusivo del personal municipal. Las cuentas las crea
                    el administrador del sistema.
                </p>
            </aside>

            <main className="flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-sm space-y-8">
                    <Link
                        href={home()}
                        className="flex items-center gap-3 lg:hidden"
                    >
                        <MunicipalCrest className="size-11" />
                        <span className="grid leading-tight">
                            <span className="font-display text-lg font-bold">
                                {name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Municipalidad Provincial de Puno
                            </span>
                        </span>
                    </Link>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">{title}</h1>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>

                    {children}
                </div>
            </main>
        </div>
    );
}
