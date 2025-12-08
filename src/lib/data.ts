import { User, Order, SheetSize, OrderStatus } from '@/lib/types';
import { PlaceHolderImages } from './placeholder-images';

const gangSheet1 = PlaceHolderImages.find(img => img.id === 'gangSheet1')?.imageUrl || '';
const gangSheet2 = PlaceHolderImages.find(img => img.id === 'gangSheet2')?.imageUrl || '';

export const mockUsers: User[] = [];

export const mockSheetSizes: SheetSize[] = [
    { name: '22" x 24"', width: 22, height: 24, price: 24.00 },
    { name: '22" x 36"', width: 22, height: 36, price: 36.00 },
    { name: '22" x 60"', width: 22, height: 60, price: 55.00 },
    { name: '22" x 120"', width: 22, height: 120, price: 100.00 },
    { name: '22" x 240"', width: 22, height: 240, price: 180.00 },
];

export const mockOrders: Order[] = [];

export const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.PENDING:
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case OrderStatus.PROCESSING:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case OrderStatus.PRINTED:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case OrderStatus.SHIPPED:
      return 'bg-accent/20 text-accent border-accent/30';
    case OrderStatus.DELIVERED:
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case OrderStatus.CANCELLED:
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};
