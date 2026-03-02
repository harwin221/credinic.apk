

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavItem } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import type { UserRole, Permission } from '@/lib/types';
import { useUser } from '@/hooks/use-user';
import { rolePermissions } from '@/lib/constants';


interface AppNavigationProps {
  navItems: NavItem[];
  isCollapsed?: boolean;
}

export function AppNavigation({ navItems, isCollapsed = false }: AppNavigationProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const accessibleNavItems = navItems.filter(item => {
    if (item.disabled) return false;
    if (!user) return false;

    const userRole = user.role.toUpperCase() as UserRole;
    
    // Admin sees everything
    if (userRole === 'ADMINISTRADOR') return true;

    // Check if the user's role has the specific permission required by the nav item
    const userPermissions = rolePermissions[userRole] || [];
    return userPermissions.includes(item.permission);
  });


  return (
    <SidebarMenu>
      {accessibleNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
            disabled={item.disabled}
            tooltip={isCollapsed ? item.title : undefined}
          >
            <Link href={item.href} prefetch={false}>
              <item.icon className="text-primary" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
