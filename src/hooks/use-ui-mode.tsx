'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type UiMode = 'original' | 'stickermule';

interface UiModeContextType {
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
  toggleUiMode: () => void;
}

const UiModeContext = createContext<UiModeContextType | undefined>(undefined);

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const [uiMode, setUiModeState] = useState<UiMode>('original');

  // Load from localStorage on client side
  useEffect(() => {
    const savedMode = localStorage.getItem('pxl8-ui-mode') as UiMode;
    if (savedMode === 'original' || savedMode === 'stickermule') {
      setUiModeState(savedMode);
    }
  }, []);

  const setUiMode = (mode: UiMode) => {
    setUiModeState(mode);
    localStorage.setItem('pxl8-ui-mode', mode);
  };

  const toggleUiMode = () => {
    const nextMode = uiMode === 'original' ? 'stickermule' : 'original';
    setUiMode(nextMode);
  };

  return (
    <UiModeContext.Provider value={{ uiMode, setUiMode, toggleUiMode }}>
      {children}
    </UiModeContext.Provider>
  );
}

export function useUiMode() {
  const context = useContext(UiModeContext);
  if (context === undefined) {
    throw new Error('useUiMode must be used within a UiModeProvider');
  }
  return context;
}
