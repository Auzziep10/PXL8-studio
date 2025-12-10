'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import React from 'react';

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showHeader = !pathname.startsWith('/admin') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/settings');

  return (
    <>
      {showHeader && <Header />}
      <main className="flex-grow">{children}</main>
    </>
  );
}
