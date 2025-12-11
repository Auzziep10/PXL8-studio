
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PXL8Logo } from '@/components/icons';
import { LayoutGrid, LogOut, ShoppingCart, User, Upload, Wand2, Search as SearchIcon, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart.tsx';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { User as AppUser } from '@/lib/types';


const navLinks = [
  { href: '/track', label: 'Transfers', icon: SearchIcon },
  { href: '/ai-designer', label: 'AI Designer', icon: Sparkles },
  { href: '/build', label: 'Builder', icon: Wand2 },
  { href: '/upload', label: 'Upload', icon: Upload },
];

export default function Header() {
  const pathname = usePathname();
  const cart = useCart();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isAdmin, setIsAdmin] = useState(false);

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


  const cartItemCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  
  const isAuthenticated = !!user;

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <PXL8Logo className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-2 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'transition-colors hover:text-foreground/80 px-3 py-1.5 rounded-md',
                pathname === link.href ? 'text-foreground bg-secondary' : 'text-foreground/60'
              )}
            >
              {link.label}
            </Link>
          ))}
          {isAuthenticated && (
            <Link
                href="/dashboard"
                className={cn(
                    'transition-colors hover:text-foreground/80 px-3 py-1.5 rounded-md',
                    pathname.startsWith('/dashboard') || pathname.startsWith('/admin') ? 'text-foreground bg-secondary' : 'text-foreground/60'
                )}
            >
                Dashboard
            </Link>
          )}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isAuthenticated && isAdmin && (
             <Button variant="ghost" size="icon" asChild>
                <Link href="/admin">
                    <LayoutGrid className="h-5 w-5" />
                    <span className="sr-only">Admin Panel</span>
                </Link>
             </Button>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart">
                <div className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {cartItemCount}
                        </span>
                    )}
                </div>
                <span className="sr-only">Cart</span>
            </Link>
          </Button>

          {isUserLoading || isProfileLoading ? (
            <div className='w-8 h-8 bg-muted rounded-full animate-pulse' />
          ) : isAuthenticated ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Account</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </>
          ) : (
            <Button asChild>
                <Link href="/auth/login">Login</Link>
            </Button>
          )}

        </div>
      </div>
    </header>
  );
}
