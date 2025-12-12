'use client';

import { useState, useEffect, createContext, useContext, ReactNode, Dispatch, SetStateAction } from 'react';
import type { CartItem, ServiceCartItem, DynamicSheetCartItem, Artwork, SheetCartItem } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  setItems: Dispatch<SetStateAction<CartItem[]>>;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  tempArtwork: Omit<Artwork, 'id'> | null;
  addTempArtwork: (artwork: Omit<Artwork, 'id'>) => void;
  clearTempArtwork: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tempArtwork, setTempArtwork] = useState<Omit<Artwork, 'id'> | null>(null);

  // Load cart from localStorage on initial render
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem('pxl8-cart');
      if (storedItems) {
        setItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error('Failed to parse cart from localStorage', error);
      setItems([]);
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      const storableItems = items.map(item => {
        // Only strip large data if it's a data URL and likely very large.
        // Keep permanent URLs.
        if ((item.type === 'sheet' || item.type === 'dynamic_sheet') && item.previewUrl.startsWith('data:')) {
            // Check size. A 1MB data URL is roughly 1.37 million characters.
            if (item.previewUrl.length > 1000000) { 
                 const { previewUrl, artworks, ...rest } = item as (SheetCartItem | DynamicSheetCartItem);
                 const smallItem = {
                     ...rest,
                     // Add a flag to indicate that the preview was stripped.
                     previewStripped: true
                 };
                 return smallItem;
            }
        }
        return item;
      });
      localStorage.setItem('pxl8-cart', JSON.stringify(storableItems));
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Could not save cart changes. Your browser storage is full.');
      }
    }
  }, [items]);

  const addTempArtwork = (artwork: Omit<Artwork, 'id'>) => {
    setTempArtwork(artwork);
  };
  
  const clearTempArtwork = () => {
    setTempArtwork(null);
  };

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
       // If the item is a service, check if it already exists and update quantity
      if (item.type === 'service') {
        const existingItemIndex = prevItems.findIndex(i => i.id === item.id && i.type === 'service');
        if (existingItemIndex > -1) {
          const updatedItems = [...prevItems];
          const existingItem = updatedItems[existingItemIndex] as ServiceCartItem;
          existingItem.quantity += item.quantity;
          return updatedItems;
        }
      }
      // For new services or any sheet items, add them to the cart
      return [...prevItems, item];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter(item => item.quantity > 0) // Remove if quantity is 0
    );
  };
  
  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider value={{ items, setItems, addItem, removeItem, updateItemQuantity, clearCart, tempArtwork, addTempArtwork, clearTempArtwork }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
