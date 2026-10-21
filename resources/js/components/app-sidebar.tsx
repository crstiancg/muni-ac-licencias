import { Link } from '@inertiajs/react';
import {
    BadgeCheck,
    BookOpen,
    ClipboardList,
    FileText,
    FolderGit2,
    History,
    Landmark,
    LayoutGrid,
    Receipt,
    ShieldCheck,
    Store,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as auditIndex } from '@/routes/audit';
import { index as establishmentsIndex } from '@/routes/establishments';
import { index as itseIndex } from '@/routes/itse';
import { index as licensesIndex } from '@/routes/licenses';
import { index as paymentOrdersIndex } from '@/routes/payment-orders';
import { index as procedureTypesIndex } from '@/routes/procedure-types';
import { index as proceduresIndex } from '@/routes/procedures';
import { revenue } from '@/routes/reports';
import { index as taxpayersIndex } from '@/routes/taxpayers';
import { index as uitsIndex } from '@/routes/uits';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Panel',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Trámites',
        href: proceduresIndex(),
        icon: FileText,
    },
    {
        title: 'Licencias',
        href: licensesIndex(),
        icon: BadgeCheck,
    },
    {
        title: 'ITSE',
        href: itseIndex(),
        icon: ShieldCheck,
    },
    {
        title: 'Caja',
        href: paymentOrdersIndex(),
        icon: Receipt,
    },
    {
        title: 'Recaudación',
        href: revenue(),
        icon: Wallet,
    },
    {
        title: 'Contribuyentes',
        href: taxpayersIndex(),
        icon: Users,
    },
    {
        title: 'Establecimientos',
        href: establishmentsIndex(),
        icon: Store,
    },
];

const parameterNavItems: NavItem[] = [
    {
        title: 'UIT',
        href: uitsIndex(),
        icon: Landmark,
    },
    {
        title: 'Tipos de trámite',
        href: procedureTypesIndex(),
        icon: ClipboardList,
    },
    {
        title: 'Auditoría',
        href: auditIndex(),
        icon: History,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                <NavMain items={parameterNavItems} label="Parametrización" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
