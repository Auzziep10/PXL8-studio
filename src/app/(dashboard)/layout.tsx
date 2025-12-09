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
import { signOut } from 'firebase/auth';
import { useEffect, useState, cloneElement } from 'react';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';


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
  
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/auth/login');
    }
  }, [isUserLoading, user, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  useEffect(() => {
    if (userProfile && userProfile.role === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [userProfile]);

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home, roles: ['customer', 'admin'] },
    { href: '/admin', label: 'Fulfillment', icon: LayoutGrid, roles: ['admin'] },
  ];
  
  const accessibleNavItems = navItems.filter(item => {
    if (item.roles.includes('admin') && isAdmin) return true;
    if (item.roles.includes('customer') && !isAdmin) return true; // Only show overview for customers
    if (item.href === '/dashboard' && isAdmin) return true; // Admins should see overview too
    return false;
  });

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
        router.push('/auth/login');
    }
  };

  const pageTitle = pathname.split('/').pop()?.replace('-', ' ');

  if (isUserLoading || isProfileLoading || !user) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  // Pass isAdmin prop to children
  const childrenWithProps = cloneElement(children as React.ReactElement, { isAdmin });

  return (
    <SidebarProvider>
      <Sidebar className="pt-14">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <PXL8Logo className="h-10 w-auto" />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {isUserLoading || isProfileLoading ? (
              <div className="p-2 space-y-2">
                 <div className="h-8 bg-muted rounded-md animate-pulse"/>
                 <div className="h-8 bg-muted rounded-md animate-pulse"/>
              </div>
            ) : (
              accessibleNavItems.map((item) => (
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
            {isAdmin && (
              <Button variant="outline" size="icon" asChild>
                <Link href="/admin">
                  <LayoutGrid className="h-5 w-5" />
                  <span className="sr-only">Fulfillment</span>
                </Link>
              </Button>
            )}
            <Button variant="outline" size="icon" asChild>
                <Link href="/dashboard">
                    <User className="h-5 w-5" />
                    <span className="sr-only">My Account</span>
                </Link>
            </Button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {childrenWithProps}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
