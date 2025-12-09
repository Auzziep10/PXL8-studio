'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth/login');
    }
  }, [isUserLoading, user, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc(userDocRef);

  const userRole = userProfile?.role || 'customer';

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home, roles: ['customer', 'admin'] },
    { href: '/admin', label: 'Fulfillment', icon: LayoutGrid, roles: ['admin'] },
  ];

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
        router.push('/auth/login');
    }
  };

  const pageTitle = pathname.split('/').pop()?.replace('-', ' ');

  if (isUserLoading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

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
            {isUserLoading ? (
              <div className="p-2 space-y-2">
                 <div className="h-8 bg-muted rounded-md animate-pulse"/>
                 <div className="h-8 bg-muted rounded-md animate-pulse"/>
              </div>
            ) : (
              navItems.filter(item => item.roles.includes(userRole)).map((item) => (
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
            )))}
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
                    <SidebarMenuButton onClick={handleLogout} asChild tooltip={{ children: 'Logout' }}>
                        <span>
                            <LogOut />
                            <span>Logout</span>
                        </span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="pt-14">
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="sm:hidden" />
            <div className='flex-1'>
                <h1 className="text-xl font-semibold capitalize">
                    {userProfile?.firstName ? `Welcome, ${userProfile.firstName}` : pageTitle}
                </h1>
            </div>
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
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
