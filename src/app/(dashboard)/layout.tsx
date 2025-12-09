
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Home, LayoutGrid, User, Settings, LogOut } from 'lucide-react';
import { PXL8Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // In a real app, this would be from context
  const userRole = 'admin'; 

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home, roles: ['customer', 'admin'] },
    { href: '/admin', label: 'Fulfillment', icon: LayoutGrid, roles: ['admin'] },
  ];

  return (
    <SidebarProvider>
      <Sidebar className="pt-14">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <PXL8Logo className="size-6 text-primary" />
            <span className="text-lg font-semibold">PXL8</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.filter(item => item.roles.includes(userRole)).map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label }}
                  >
                    <span>
                      <item.icon />
                      <span>{item.label}</span>
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href="#" passHref>
                        <SidebarMenuButton asChild tooltip={{ children: 'Settings' }}>
                            <span>
                                <Settings />
                                <span>Settings</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="#" passHref>
                        <SidebarMenuButton asChild tooltip={{ children: 'Logout' }}>
                            <span>
                                <LogOut />
                                <span>Logout</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="sm:hidden" />
            <div className='flex-1'>
                <h1 className="text-xl font-semibold capitalize">
                    {pathname.split('/').pop()}
                </h1>
            </div>
            <Button variant="outline" size="icon" asChild>
                <Link href="/auth/login">
                    <User className="h-5 w-5" />
                    <span className="sr-only">My Account</span>
                </Link>
            </Button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
