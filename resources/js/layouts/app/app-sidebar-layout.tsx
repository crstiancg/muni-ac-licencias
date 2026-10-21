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
                {/* Dokploy-like frame: outer panel, content in an inner card. */}
                <div className="flex flex-1 flex-col px-2 pb-2 md:pr-4 md:pb-4 md:pl-1">
                    <div className="flex flex-1 flex-col rounded-xl border bg-sidebar p-1.5 md:p-2">
                        <div className="flex-1 rounded-lg border bg-background">
                            {children}
                        </div>
                    </div>
                </div>
            </AppContent>
        </AppShell>
    );
}
