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
import { Home, LayoutGrid, User, Settings, LogOut, DollarSign, Upload, Wand2, Search as SearchIcon, Sparkles } from 'lucide-react';
import { PXL8Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';
import { cn } from '@/lib/utils';


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
    // Check custom claims first for admin role
    user?.getIdTokenResult().then(idTokenResult => {
      if (idTokenResult.claims.admin) {
        setIsAdmin(true);
      } else {
        // Fallback to checking Firestore role
        if (userProfile && userProfile.role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }
    });
  }, [user, userProfile]);


  const siteNavItems = [
    { href: '/track', label: 'Transfers', icon: SearchIcon },
    { href: '/build', label: 'Builder', icon: Wand2 },
    { href: '/upload', label: 'Upload', icon: Upload },
    { href: '/ai-designer', label: 'AI Designer', icon: Sparkles },
  ];

  const adminNavItems = [
    { href: '/dashboard', label: 'Overview', icon: Home, roles: ['customer', 'admin'] },
    { href: '/admin', label: 'Fulfillment', icon: LayoutGrid, roles: ['admin'] },
    { href: '/admin/pricing', label: 'Pricing', icon: DollarSign, roles: ['admin'] },
  ];
  
  const accessibleAdminNavItems = adminNavItems.filter(item => {
    if (item.roles.includes('admin') && isAdmin) return true;
    // Show 'Overview' to customers, but not other admin links.
    if (item.roles.includes('customer') && !isAdmin && item.href === '/dashboard') return true;
    // Admins should also see the 'Overview' link.
    if (item.href === '/dashboard' && isAdmin) return true;
    return false;
  });

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
        router.push('/auth/login');
    }
  };

  const pageTitle = pathname.split('/').pop()?.replace('-', ' ');

  if (isUserLoading || isProfileLoading) { 
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/">
            <div className="flex items-center gap-2">
              <PXL8Logo className="h-10 w-auto" />
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {isUserLoading || isProfileLoading ? (
              <div className="p-2 space-y-2">
                 <div className="h-8 bg-muted rounded-md animate-pulse"/>
                 <div className="h-8 bg-muted rounded-md animate-pulse"/>
              </div>
            ) : (
              accessibleAdminNavItems.map((item) => (
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
                    <Link href="/settings" passHref>
                        <SidebarMenuButton asChild tooltip={{ children: 'Settings' }} isActive={pathname === '/settings'}>
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
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="sm:hidden" />
            
            <nav className="hidden md:flex items-center gap-2 text-sm">
                {siteNavItems.map(item => (
                    <Link 
                        key={item.href} 
                        href={item.href} 
                        className={cn('transition-colors hover:text-foreground/80 px-3 py-1.5 rounded-md',
                         pathname === item.href ? 'text-foreground bg-secondary' : 'text-foreground/60'
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className='flex-1 flex justify-end items-center gap-2'>
                 <h1 className="text-sm font-semibold capitalize hidden lg:block">
                    {userProfile?.firstName ? `Welcome, ${userProfile.firstName}` : pageTitle}
                </h1>

                {isAdmin && (
                  <Button variant="outline" size="icon" asChild>
                    <Link href="/admin">
                      <LayoutGrid className="h-5 w-5" />
                      <span className="sr-only">Fulfillment</span>
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="icon" asChild>
                    <Link href="/settings">
                        <User className="h-5 w-5" />
                        <span className="sr-only">My Account</span>
                    </Link>
                </Button>
            </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
