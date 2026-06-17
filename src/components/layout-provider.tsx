
'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/header';
import React from 'react';
import { cn } from '@/lib/utils';
import { UiModeProvider } from '@/hooks/use-ui-mode';
import UiModeToggle from '@/components/ui-mode-toggle';

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname.startsWith('/settings');
  const showHeader = !isDashboard;

  if (isDashboard) {
    return (
      <UiModeProvider>
        <main className="flex-grow">{children}</main>
        <UiModeToggle />
      </UiModeProvider>
    );
  }

  return (
    <UiModeProvider>
      {showHeader && <Header />}
      <main className={cn('flex-grow', showHeader && 'pt-[3rem]')}>{children}</main>
      <UiModeToggle />
    </UiModeProvider>
  );
}

