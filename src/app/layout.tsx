import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/hooks/use-cart.tsx';
import { FirebaseClientProvider } from '@/firebase';
import { LayoutProvider } from '@/components/layout-provider';

// This is now a Server Component, so metadata export is allowed.
export const metadata: Metadata = {
  title: 'PXL8 DTF Platform',
  description: 'Direct-to-Film (DTF) Gang Sheet Builder & Fulfillment Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background flex flex-col')}>
        <FirebaseClientProvider>
          <CartProvider>
            <LayoutProvider>{children}</LayoutProvider>
            <Toaster />
          </CartProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
