import { Link } from '@inertiajs/react';
import {
    BadgeCheck,
    ClipboardList,
    FileText,
    History,
    KeyRound,
    Landmark,
    LayoutGrid,
    Receipt,
    ShieldCheck,
    Store,
    UserCog,
    Users,
    Wallet,
    Warehouse,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
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
import { index as marketsIndex } from '@/routes/markets';
import { index as paymentOrdersIndex } from '@/routes/payment-orders';
import { index as procedureTypesIndex } from '@/routes/procedure-types';
import { index as proceduresIndex } from '@/routes/procedures';
import { revenue } from '@/routes/reports';
import { index as rolesIndex } from '@/routes/roles';
import { index as taxpayersIndex } from '@/routes/taxpayers';
import { index as uitsIndex } from '@/routes/uits';
import { index as usersIndex } from '@/routes/users';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Panel',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Trámites',
        permission: 'procedures.view',
        href: proceduresIndex(),
        icon: FileText,
    },
    {
        title: 'Licencias',
        permission: 'procedures.view',
        href: licensesIndex(),
        icon: BadgeCheck,
    },
    {
        title: 'ITSE',
        permission: 'itse.manage',
        href: itseIndex(),
        icon: ShieldCheck,
    },
    {
        title: 'Caja',
        permission: 'payments.collect',
        href: paymentOrdersIndex(),
        icon: Receipt,
    },
    {
        title: 'Recaudación',
        permission: 'reports.view',
        href: revenue(),
        icon: Wallet,
    },
    {
        title: 'Mercados',
        permission: 'markets.manage',
        href: marketsIndex(),
        icon: Warehouse,
    },
    {
        title: 'Contribuyentes',
        permission: 'procedures.view',
        href: taxpayersIndex(),
        icon: Users,
    },
    {
        title: 'Establecimientos',
        permission: 'procedures.view',
        href: establishmentsIndex(),
        icon: Store,
    },
];

const parameterNavItems: NavItem[] = [
    {
        title: 'UIT',
        permission: 'parameters.manage',
        href: uitsIndex(),
        icon: Landmark,
    },
    {
        title: 'Tipos de trámite',
        permission: 'parameters.manage',
        href: procedureTypesIndex(),
        icon: ClipboardList,
    },
    {
        title: 'Auditoría',
        permission: 'audit.view',
        href: auditIndex(),
        icon: History,
    },
    {
        title: 'Usuarios',
        href: usersIndex(),
        icon: UserCog,
        permission: 'users.manage',
    },
    {
        title: 'Roles y permisos',
        href: rolesIndex(),
        icon: KeyRound,
        permission: 'users.manage',
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="floating">
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
                <NavMain items={mainNavItems} label="Gestión" />
                <NavMain items={parameterNavItems} label="Administración" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
