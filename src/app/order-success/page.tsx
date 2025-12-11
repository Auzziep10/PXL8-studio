'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Order } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function OrderSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const firestore = useFirestore();
    const { user } = useUser();

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore || !orderId) {
            setIsLoading(false);
            setError('Order ID not found.');
            return;
        };

        const fetchOrder = async () => {
            setIsLoading(true);
            try {
                // Since we don't know the full path, we must query the collection.
                // This is less performant but necessary without the user ID for guests.
                const ordersRef = collection(firestore, 'orders');
                const q = query(ordersRef, where('orderId', '==', orderId));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setError('Could not find your order. Please check the ID and try again.');
                } else {
                    const orderDoc = querySnapshot.docs[0];
                    setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order);
                }
            } catch (err) {
                console.error("Error fetching order:", err);
                setError('There was a problem retrieving your order details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [firestore, orderId]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] px-4 text-center">
            <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 max-w-2xl w-full">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500/20">
                    <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Order Confirmed!</h1>
                <p className="text-zinc-400 mb-8">
                    Thank you for your purchase. We've received your order and will get started on it right away.
                </p>

                {isLoading ? (
                    <Skeleton className="h-10 w-48 mx-auto" />
                ) : error ? (
                    <p className="text-red-400">{error}</p>
                ) : order && (
                    <div className="bg-zinc-900/50 border border-white/10 rounded-xl px-6 py-4 max-w-sm mx-auto mb-8">
                        <p className="text-sm text-zinc-500">Your Order ID is:</p>
                        <p className="text-2xl font-mono font-bold text-primary tracking-widest">{order.orderId}</p>
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button asChild size="lg">
                        <Link href="/dashboard">
                            <ShoppingBag className="mr-2 h-5 w-5" />
                            View My Orders
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/build">Continue Shopping</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Wrap the component in Suspense to handle useSearchParams
export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OrderSuccessContent />
        </Suspense>
    );
}
