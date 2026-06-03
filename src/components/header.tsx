
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PXL8Logo } from '@/components/ui/icons';
import { LayoutGrid, LogOut, ShoppingCart, User, Upload, Wand2, Search as SearchIcon, Sparkles, ChevronDown } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { User as AppUser } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const navLinks = [
  { href: '/build', label: 'Builder' },
  { href: '/upload', label: 'Upload' },
  { href: '/design-studio', label: 'Design Studio' },
  { href: '/about', label: 'About' },
];

const transferLinks = [
    { href: '/track', label: 'DTF Transfers' },
    { href: '/elevated-flex', label: 'Elevated Flex Transfers' },
]

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
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
        isScrolled ? 'bg-background/90 backdrop-blur-md border-b border-zinc-200/50' : 'bg-transparent'
    )}>
      <div className="flex h-20 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Link href="/" className="mr-6 flex items-center space-x-3">
          <span className="font-serif text-2xl font-bold text-zinc-900 tracking-tight">PXL8</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-sans font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            DESIGN PORTALS OPEN
          </span>
        </Link>
        <div className="flex-grow flex justify-end items-center space-x-6">
          <div className="hidden md:flex flex-col items-end text-right font-mono pr-2">
            <span className="text-[8px] text-zinc-400 tracking-widest uppercase">Local Time</span>
            <span className="text-xs font-semibold text-zinc-800">{time}</span>
          </div>

          <div className="flex items-center space-x-2">
            {(isUserLoading || isProfileLoading) ? (
              <div className='w-24 h-9 bg-zinc-200 rounded-full animate-pulse' />
            ) : isAuthenticated ? (
              <>
                <Button variant="outline" asChild className="rounded-full border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50 tracking-wider uppercase text-[10px] font-semibold px-4 h-9">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button variant="outline" onClick={handleLogout} className="rounded-full border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50 tracking-wider uppercase text-[10px] font-semibold px-4 h-9">
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="outline" asChild className="rounded-full border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50 tracking-wider uppercase text-[10px] font-semibold px-4 h-9">
                <Link href="/auth/login">Login</Link>
              </Button>
            )}

            <Button variant="outline" size="icon" asChild className="rounded-full border-zinc-300 text-zinc-800 bg-white hover:bg-zinc-50 relative w-9 h-9">
              <Link href="/cart">
                <ShoppingCart className="h-4 w-4" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 text-[9px] font-bold text-white">
                    {cartItemCount}
                  </span>
                )}
                <span className="sr-only">Cart</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
