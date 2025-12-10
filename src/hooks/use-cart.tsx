'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import type { CartItem } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper function to safely stringify JSON, handling potential circular references
// and removing large data URLs before storage.
function safeStringifyForStorage(items: CartItem[]): string {
  const storableItems = items.map(item => {
    // Only store URLs for persistence, not the full data URLs if they are long
    const { previewUrl, printReadyUrl, ...rest } = item;
    return { 
        ...rest, 
        previewUrl: previewUrl.startsWith('data:') ? '' : previewUrl,
        printReadyUrl: printReadyUrl.startsWith('data:') ? '' : printReadyUrl
    };
  });
  return JSON.stringify(storableItems);
}


export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load from localStorage on initial render
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem('pxl8-cart');
      if (storedItems) {
        // Since we don't store the image data, this is safe to parse.
        // The app must handle cases where image URLs are empty.
        setItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error('Failed to parse cart from localStorage', error);
      setItems([]);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    try {
      // Don't save image data to local storage. It can exceed limits.
      const storableItems = items.map(({ previewUrl, printReadyUrl, ...rest }) => rest);
      localStorage.setItem('pxl8-cart', JSON.stringify(storableItems));
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Could not save cart changes. Your browser storage is full.');
      }
    }
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // For this simplified logic, all new gang sheets are unique items
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
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemQuantity, clearCart }}>
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
