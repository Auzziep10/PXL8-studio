'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import React from 'react';

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/settings');
  const showHeader = !isDashboard;

  if (isDashboard) {
    return <main className="flex-grow">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-grow pt-[5rem]">{children}</main>
    </>
  );
}
