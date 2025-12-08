'use client';

import { useCart, CartProvider } from '@/hooks/use-cart.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Trash2, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

function CartContents() {
  const { items, removeItem, updateItemQuantity } = useCart();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const { toast } = useToast();

  const subtotal = items.reduce((sum, item) => sum + item.sheetSize.price * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  // Mock shipping based on weight (e.g., 3oz per sheet) - $5 base + $0.50 per sheet
  const shipping = subtotal > 0 ? 5 + totalQuantity * 0.50 : 0;
  const total = subtotal + shipping - discount;

  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === 'TEST') {
      setDiscount(subtotal);
      toast({ title: 'Coupon Applied', description: 'Your order total has been set to $0.00' });
    } else {
      toast({ variant: 'destructive', title: 'Invalid Coupon', description: 'The coupon code you entered is not valid.' });
    }
  };


  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-semibold mb-2">Your Cart is Empty</h2>
        <p className="text-muted-foreground mb-6">Looks like you haven't added any sheets yet.</p>
        <Button asChild size="lg">
          <Link href="/build">Start Building</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Cart ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map(item => (
                <div key={item.id} className="flex gap-4 p-6">
                  <Image
                    src={item.compositeImageUrl}
                    alt={item.sheetSize.name}
                    width={150}
                    height={100}
                    className="rounded-md border bg-secondary object-cover aspect-video"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold">{item.sheetSize.name} Gang Sheet</h3>
                      <p className="text-sm text-muted-foreground">${item.sheetSize.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value))}
                        className="w-20 h-9"
                      />
                       <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping (est.)</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            {discount > 0 && (
                 <div className="flex justify-between text-accent">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex gap-2">
                <Input placeholder="Coupon Code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                <Button variant="outline" onClick={handleApplyCoupon}>Apply</Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button size="lg" className="w-full">
                Proceed to Checkout <ArrowRight className="ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function CartPage() {
    return (
        <CartProvider>
            <div className="container mx-auto max-w-7xl py-12 px-4 sm:px-6 lg:px-8">
                <CartContents />
            </div>
        </CartProvider>
    )
}
