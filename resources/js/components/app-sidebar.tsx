import { Link } from '@inertiajs/react';
import {
    BookOpen,
    ClipboardList,
    FolderGit2,
    Landmark,
    LayoutGrid,
    Store,
    Users,
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
import { index as establishmentsIndex } from '@/routes/establishments';
import { index as procedureTypesIndex } from '@/routes/procedure-types';
import { index as taxpayersIndex } from '@/routes/taxpayers';
import { index as uitsIndex } from '@/routes/uits';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
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
