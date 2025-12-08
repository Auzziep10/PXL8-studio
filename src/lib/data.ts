import { User, Order, SheetSize, OrderStatus } from '@/lib/types';
import { PlaceHolderImages } from './placeholder-images';

const gangSheet1 = PlaceHolderImages.find(img => img.id === 'gangSheet1')?.imageUrl || '';
const gangSheet2 = PlaceHolderImages.find(img => img.id === 'gangSheet2')?.imageUrl || '';

export const mockUsers: User[] = [
  { id: 'user-1', name: 'John Doe', email: 'john.doe@example.com', role: 'customer', ltv: 1560.75 },
  { id: 'user-2', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'customer', ltv: 820.50 },
  { id: 'admin-1', name: 'Admin User', email: 'admin@pxl8.com', role: 'admin', ltv: 0 },
];

export const mockSheetSizes: SheetSize[] = [
    { name: '22" x 24"', width: 22, height: 24, price: 24.00 },
    { name: '22" x 36"', width: 22, height: 36, price: 36.00 },
    { name: '22" x 60"', width: 22, height: 60, price: 55.00 },
    { name: '22" x 120"', width: 22, height: 120, price: 100.00 },
    { name: '22" x 240"', width: 22, height: 240, price: 180.00 },
];

export const mockOrders: Order[] = [
  {
    id: 'ord-1',
    orderId: 'ORD-1001',
    customerId: 'user-1',
    customerName: 'John Doe',
    orderDate: '2024-07-28T10:00:00Z',
    status: 'Shipped',
    items: [
      { id: 'item-1', sheetSize: mockSheetSizes[2], compositeImageUrl: gangSheet1, artworks: [], quantity: 2 },
    ],
    total: 125.50,
    shippingAddress: { zip: '90210' },
    trackingId: 'TRK-ABC12345',
    printReadyUrl: gangSheet2,
    previewUrl: gangSheet1,
  },
  {
    id: 'ord-2',
    orderId: 'ORD-1002',
    customerId: 'user-2',
    customerName: 'Jane Smith',
    orderDate: '2024-07-29T14:30:00Z',
    status: 'Processing',
    items: [
      { id: 'item-2', sheetSize: mockSheetSizes[0], compositeImageUrl: gangSheet1, artworks: [], quantity: 1 },
    ],
    total: 32.00,
    shippingAddress: { zip: '10001' },
    trackingId: 'TRK-XYZ98765',
    printReadyUrl: gangSheet2,
    previewUrl: gangSheet1,
  },
  {
    id: 'ord-3',
    orderId: 'ORD-1003',
    customerId: 'user-1',
    customerName: 'John Doe',
    orderDate: '2024-07-30T11:00:00Z',
    status: 'Pending',
    items: [
      { id: 'item-3', sheetSize: mockSheetSizes[3], compositeImageUrl: gangSheet1, artworks: [], quantity: 1 },
    ],
    total: 110.00,
    shippingAddress: { zip: '90210' },
    trackingId: 'TRK-PQR65432',
    printReadyUrl: gangSheet2,
    previewUrl: gangSheet1,
  },
    {
    id: 'ord-4',
    orderId: 'ORD-1004',
    customerId: 'user-3',
    customerName: 'Guest User',
    orderDate: '2024-07-30T18:20:00Z',
    status: 'Delivered',
    items: [
      { id: 'item-4', sheetSize: mockSheetSizes[1], compositeImageUrl: gangSheet1, artworks: [], quantity: 3 },
    ],
    total: 120.00,
    shippingAddress: { zip: '60606' },
    trackingId: 'TRK-LMN32109',
    printReadyUrl: gangSheet2,
    previewUrl: gangSheet1,
  },
];

export const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Processing':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Printed':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Shipped':
      return 'bg-accent/20 text-accent border-accent/30';
    case 'Delivered':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Cancelled':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};
