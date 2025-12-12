
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PXL8Logo } from '@/components/ui/icons';
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
  { href: '/track', label: 'Transfers' },
  { href: '/build', label: 'Builder' },
  { href: '/upload', label: 'Upload' },
  { href: '/ai-designer', label: 'AI Designer' },
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
    <header className="absolute top-0 z-50 w-full">
      <div className="container flex h-20 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <PXL8Logo className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-2 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'transition-colors hover:text-foreground/80 px-3 py-1.5 rounded-md text-foreground',
                pathname === link.href ? 'font-medium' : 'text-foreground/60'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
           {isUserLoading || isProfileLoading ? (
            <div className='w-24 h-8 bg-black/10 rounded-md animate-pulse' />
          ) : isAuthenticated ? (
             <Button variant="ghost" asChild className="hover:bg-black/10 text-foreground">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
          ) : (
            <Button asChild variant="ghost" className="hover:bg-black/10 text-foreground">
                <Link href="/auth/login">Login</Link>
            </Button>
          )}

           <Button variant="ghost" size="icon" asChild className="hover:bg-black/10 text-foreground">
            <Link href="/cart">
                <div className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemCount > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-black">
                            {cartItemCount}
                        </span>
                    )}
                </div>
                <span className="sr-only">Cart</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
