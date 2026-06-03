'use client';

import CustomerPathWizard from '@/components/customer-path-wizard';

export default function Home() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col justify-between bg-background overflow-hidden">
      {/* Visually hidden H1 for SEO */}
      <h1 className="sr-only">PXL8 Studio — Premium Direct-to-Film (DTF) Transfers Portal</h1>
      
      {/* Main Wizard Area */}
      <div className="flex-grow flex items-stretch">
        <CustomerPathWizard />
      </div>
      
      {/* Clean Brand Footer */}
      <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] tracking-widest text-zinc-400 font-mono uppercase px-8 py-4 border-t border-zinc-200/40 gap-2 bg-background z-10">
        <div>PXL8 Studio © 2026 PXL8 GROUP. ALL RIGHTS RESERVED.</div>
        <div>EMAIL: info@pxl8studio.com — PHONE: 888.555.0199</div>
      </footer>
    </div>
  );
}
