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
    const { compositeImageUrl, artworks, ...rest } = item;
    const storableArtworks = artworks.map(({ imageUrl, ...art }) => art);
    return { ...rest, artworks: storableArtworks, compositeImageUrl: '' };
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
        // We only store metadata, so we can parse it back directly.
        // The actual image data URLs will be missing, which is expected.
        // The application should be robust enough to handle this.
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
      const storableString = safeStringifyForStorage(items);
      localStorage.setItem('pxl8-cart', storableString);
    } catch (error) {
      console.error('Failed to save cart to localStorage', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
         // This is a critical error, inform the user.
        alert('Could not save cart changes. Your browser storage is full. Please clear some space or try a different browser.');
      }
    }
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // Find item based on sheet size and whether it's a custom build or pre-built upload
      // A simple way is to check if it has artworks or not.
      const isCustomBuild = item.artworks && item.artworks.length > 0;
      
      const existingItemIndex = prevItems.findIndex(i => 
        i.sheetSize.name === item.sheetSize.name &&
        (i.artworks && i.artworks.length > 0) === isCustomBuild
      );

      if (existingItemIndex > -1) {
        // If it's a custom build, replace it. If it's a pre-built, add quantity.
        const updatedItems = [...prevItems];
        const existingItem = updatedItems[existingItemIndex];
        
        if (isCustomBuild) {
            // For custom builds, we typically want to replace the old one if a new one is added.
            // Or, if your business logic allows multiple custom sheets of the same size,
            // you would treat it like a new item. For now, let's replace.
            updatedItems[existingItemIndex] = item;
        } else {
            // For pre-built uploads, just increase the quantity
            updatedItems[existingItemIndex] = {
              ...existingItem,
              quantity: existingItem.quantity + item.quantity,
            };
        }
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
