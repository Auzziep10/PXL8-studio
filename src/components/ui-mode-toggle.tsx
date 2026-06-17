'use client';

import React from 'react';
import { useUiMode } from '@/hooks/use-ui-mode';
import { Sparkles, Layers, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UiModeToggle() {
  const { uiMode, toggleUiMode } = useUiMode();

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex items-center gap-1.5 bg-[#FAF9F6]/95 backdrop-blur-md border border-zinc-200/80 shadow-2xl rounded-full p-1.5 text-xs text-zinc-800 font-sans select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-1 px-3 py-1 text-[9px] font-medium tracking-wider uppercase text-zinc-400 font-mono">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
        UI Option:
      </div>
      <button
        onClick={() => { if (uiMode !== 'original') toggleUiMode(); }}
        className={cn(
          "px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center gap-1",
          uiMode === 'original' 
            ? "bg-zinc-900 text-white shadow-sm" 
            : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-150/50"
        )}
      >
        <Layout className="w-3 h-3" />
        Standard
      </button>
      <button
        onClick={() => { if (uiMode !== 'stickermule') toggleUiMode(); }}
        className={cn(
          "px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest uppercase transition-all duration-200 flex items-center gap-1",
          uiMode === 'stickermule' 
            ? "bg-zinc-900 text-white shadow-sm" 
            : "text-zinc-550 hover:text-zinc-900 hover:bg-zinc-150/50"
        )}
      >
        <Layers className="w-3 h-3" />
        Sticker Mule
      </button>
    </div>
  );
}
