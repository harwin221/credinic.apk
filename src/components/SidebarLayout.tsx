
'use client';

import * as React from 'react';
import { AppLogo } from '@/components/AppLogo';
import { AppNavigation } from '@/components/AppNavigation';
import { UserProfile } from '@/components/UserProfile';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/lib/constants';
import { useUser } from '@/hooks/use-user';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog';

export function SidebarLayout({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);

  const noSidebarRoutes = ['/login', '/setup'];
  const isPublicRoute = noSidebarRoutes.includes(pathname);
  const isReportRoute = pathname.startsWith('/reports/');

  React.useEffect(() => {
    if (user && user.mustChangePassword && !isPublicRoute) {
      setIsPasswordModalOpen(true);
    } else {
      setIsPasswordModalOpen(false);
    }
  }, [user, isPublicRoute]);

  // Loader eliminado para permitir renderizado optimista (Skeleton en componentes hijos)
  // if (loading) { ... }

  // Rutas especiales sin sidebar
  if (isReportRoute) {
    return <main className="main-background-container min-h-screen">{children}</main>;
  }

  if (isPublicRoute || !user) {
    return <main className="main-background-container min-h-screen">{children}</main>;
  }

  // Default layout for all authenticated users
  return (
    <>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <AppLogo />
          </SidebarHeader>
          <SidebarContent>
            <AppNavigation navItems={NAV_ITEMS} />
          </SidebarContent>
          <SidebarFooter>
            {/* UserProfile is moved to the top bar */}
          </SidebarFooter>
        </Sidebar>
        <SidebarRail />
        <SidebarInset>
          <div className="flex items-center justify-between p-2 border-b bg-sidebar">
            <SidebarTrigger />
            <UserProfile />
          </div>
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 main-background-container">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <ChangePasswordDialog
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
