import { Link, usePage } from '@inertiajs/react';
import { BadgeCheck, Receipt, ShieldCheck, Warehouse } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
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
            <aside className="relative hidden overflow-hidden bg-zinc-900 text-zinc-300 lg:flex lg:flex-col lg:justify-between lg:p-12">
                {/* Soft institutional glow behind the content. */}
                <div className="pointer-events-none absolute -top-32 -left-32 size-112 rounded-full bg-zinc-700 opacity-40 blur-3xl" />
                <div className="pointer-events-none absolute -right-24 -bottom-40 size-96 rounded-full bg-zinc-700 opacity-30 blur-3xl" />

                <Link
                    href={home()}
                    className="relative flex items-center gap-3"
                >
                    <span className="flex size-11 items-center justify-center rounded-lg bg-white text-zinc-900">
                        <AppLogoIcon className="size-6 fill-current" />
                    </span>
                    <span className="grid leading-tight">
                        <span className="text-lg font-semibold text-white">
                            {name}
                        </span>
                        <span className="text-sm opacity-75">
                            Municipalidad Provincial de Puno
                        </span>
                    </span>
                </Link>

                <div className="relative space-y-6">
                    <h2 className="max-w-md text-3xl leading-tight font-semibold text-white">
                        Trámites, licencias y cobros en un solo lugar.
                    </h2>
                    <ul className="space-y-3">
                        {modules.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-md bg-zinc-800">
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
                        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-6 fill-current" />
                        </span>
                        <span className="grid leading-tight">
                            <span className="font-semibold">{name}</span>
                            <span className="text-xs text-muted-foreground">
                                Municipalidad Provincial de Puno
                            </span>
                        </span>
                    </Link>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
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
