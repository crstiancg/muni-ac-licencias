import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="min-w-0 overflow-x-clip">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {/* One quiet surface: the graphite sidebar is the only frame. */}
                <div className="flex flex-1 flex-col px-2 pb-2 md:pr-4 md:pb-4 md:pl-1">
                    <div className="flex-1 rounded-2xl border bg-background">
                        {children}
                    </div>
                </div>
            </AppContent>
        </AppShell>
    );
}
