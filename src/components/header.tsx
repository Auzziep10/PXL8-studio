'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PXL8Logo } from '@/components/icons';
import { LayoutGrid, LogOut, ShoppingCart, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart.tsx';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';

const navLinks = [
  { href: '/build', label: 'Builder' },
  { href: '/upload', label: 'Upload' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/track', label: 'Track Order' },
];

export default function Header() {
  const pathname = usePathname();
  const cart = useCart();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);
  const userRole = userProfile?.role || 'customer';

  const cartItemCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  
  const isAuthenticated = !!user;

  const handleLogout = async () => {
    if (auth) {
        await signOut(auth);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <PXL8Logo className="h-6 w-6" />
          <span className="font-bold hidden sm:inline-block">PXL8</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm lg:gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === link.href ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {isAuthenticated && userRole === 'admin' && (
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
