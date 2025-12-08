import type { ImproveArtworkPrintabilityOutput } from '@/ai/flows/improve-artwork-printability';

export type UserRole = 'customer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  ltv: number;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Printed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface ShippingAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  items: CartItem[];
  total: number;
  shippingAddress: ShippingAddress;
  trackingId: string;
  printReadyUrl: string;
  previewUrl: string;
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
}

export interface CartItem {
  id: string;
  sheetSize: SheetSize;
  compositeImageUrl: string;
  artworks: ArtworkOnCanvas[];
  quantity: number;
}

export enum SheetSizeEnum {
  SMALL = '22x24',
  MEDIUM = '22x36',
  LARGE = '22x60',
  XL = '22x120',
  XXL = '22x240'
}
export { SheetSizeEnum as SheetSize };

export interface GangSheetItem {
    id: string;
    file: File | null;
    previewUrl: string;
    printReadyUrl?: string;
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
