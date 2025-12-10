import type { ImproveArtworkPrintabilityOutput } from '@/ai/flows/improve-artwork-printability';
import type { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  address?: ShippingAddress;
}

export enum OrderStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  PRINTED = 'Printed',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
}

export interface ShippingAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

// This represents the structure of an item once it's part of an Order.
// It's a "flattened" version for simple database storage.
export interface OrderItem {
  id: string;
  quantity: number;
  previewUrl: string; // Customer-facing image
  printReadyUrl: string; // Production image with QR code
  sheetSizeName: string;
  sheetWidth: number;
  sheetHeight: number;
  sheetPrice: number;
}


export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  shippingAddress: ShippingAddress;
  trackingId: string;
}

export interface Artwork {
  id: string;
  name: string;
  imageUrl: string;
  width: number; // inches
  height: number; // inches
  dpi: number;
}

export interface ArtworkOnCanvas extends Artwork {
  x: number; // px
  y: number; // px
  canvasWidth: number; // px
  canvasHeight: number; // px
  quantity: number;
  analysis?: ImproveArtworkPrintabilityOutput;
  analysisLoading?: boolean;
}

export interface SheetSize {
    name: string;
    width: number; // inches
    height: number; // inches
    price: number;
    usage: 'Builder' | 'Upload' | 'AI';
}

// Represents a physical gang sheet in the cart
export interface SheetCartItem {
  id: string;
  type: 'sheet';
  sheetSize: SheetSize;
  previewUrl: string; 
  artworks: ArtworkOnCanvas[];
  quantity: number;
}

// Represents a non-physical service item in the cart
export interface ServiceCartItem {
  id: string;
  type: 'service';
  name: string;
  price: number;
  quantity: number;
}

// The CartItem is a union of all possible item types in the cart.
export type CartItem = SheetCartItem | ServiceCartItem;


export enum SheetSizeEnum {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  XL = 'XL',
  XXL = 'XXL'
}
export { SheetSizeEnum as SheetSize };

export interface GangSheetItem {
    id: string;
    file: File | null;
    previewUrl: string;
    printReadyUrl?: string;
    originalUrl?: string;
    originalFileName?: string;
    trackingId?: string;
    width: number; // inches
    height: number; // inches
    originalWidthPx: number;
    originalHeightPx: number;
    quantity: number;
    x: number; // inches
    y: number; // inches
}

export interface ShippingRate {
    id: string;
    carrier: string;
    service: string;
    rate: number;
    deliveryDays: string | null;
}
export type CartEntry = CartItem;
