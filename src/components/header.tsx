
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PXL8Logo } from '@/components/ui/icons';
import { LayoutGrid, LogOut, ShoppingCart, User, Upload, Wand2, Search as SearchIcon, Sparkles } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
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
  { href: '/design-studio', label: 'Design Studio' },
  { href: '/about', label: 'About' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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


  const cartItemCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  
  const isAuthenticated = !!user;

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
        router.push('/');
    }
  };

  return (
    <header className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isScrolled ? 'bg-background/60 backdrop-blur-lg border-b border-border/10' : 'bg-transparent'
    )}>
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
                'transition-colors hover:text-foreground/80 px-3 py-1.5 rounded-md',
                pathname === link.href ? 'font-medium text-foreground' : 'text-foreground/80'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
           {(isUserLoading || isProfileLoading) ? (
            <div className='w-24 h-8 bg-black/10 rounded-md animate-pulse' />
          ) : isAuthenticated ? (
            <>
              <Button variant="ghost" asChild className={cn('hover:bg-black/10', isScrolled ? 'text-foreground' : 'text-foreground/80 hover:text-foreground')}>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button onClick={handleLogout} size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
             <Button asChild>
                <Link href="/auth/login">Login</Link>
            </Button>
          )}

           <Button variant="ghost" size="icon" asChild className={cn('hover:bg-black/10 relative', isScrolled ? 'text-foreground' : 'text-foreground/80 hover:text-foreground')}>
            <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-black">
                        {cartItemCount}
                    </span>
                )}
                <span className="sr-only">Cart</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
