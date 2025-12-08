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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

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

  useEffect(() => {
    try {
      // Create a version of items without large image data for storage
      const storableItems = items.map(({ artworks, compositeImageUrl, ...rest }) => rest);
      localStorage.setItem('pxl8-cart', JSON.stringify(storableItems));
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Could not save cart changes. Your browser storage is full. Please clear some space or try a different browser.');
      }
    }
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // Find item based on sheet size, assuming we can't have multiple custom sheets of same size yet
      const existingItemIndex = prevItems.findIndex(i => i.sheetSize.name === item.sheetSize.name);

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + item.quantity,
          // If a new image is added for the same size, overwrite it.
          compositeImageUrl: item.compositeImageUrl,
          artworks: item.artworks
        };
        return updatedItems;
      }
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
      ).filter(item => item.quantity > 0)
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
