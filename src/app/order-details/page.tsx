
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircle, ShoppingBag, Truck, Package, DollarSign, Calendar, Info, Hash, User, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { Order, OrderItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { getStatusColor } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';

function OrderDetailsContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('id');
    const firestore = useFirestore();
    const { user } = useUser();

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore || !orderId) {
            setIsLoading(false);
            setError('Order ID not found in URL.');
            return;
        };

        const fetchOrder = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // To find the order, we query the central 'orders' collection.
                // We also check if the logged-in user is the customer for security.
                const ordersRef = collection(firestore, 'orders');
                const q = query(ordersRef, where('orderId', '==', orderId));
                
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setError('Could not find an order with that ID.');
                } else {
                    const orderDoc = querySnapshot.docs[0];
                    const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;

                    // Security check: Only allow the owner or an admin to view
                    if (user && orderData.customerId === user.uid) {
                        setOrder(orderData);
                    } else {
                        // In a real app, you might check for an admin role here.
                        // For now, we'll deny access if the UID doesn't match.
                        setError('You do not have permission to view this order.');
                    }
                }
            } catch (err) {
                console.error("Error fetching order:", err);
                setError('There was a problem retrieving your order details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [firestore, orderId, user]);
    
    if (isLoading) {
        return (
             <div className="max-w-4xl mx-auto px-4 py-8">
                <Skeleton className="h-10 w-1/2 mb-4" />
                <Skeleton className="h-6 w-1/3 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-40 w-full" />
             </div>
        )
    }
    
    if (error) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        )
    }

    if (!order) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
                <p className="text-muted-foreground">We couldn't find details for this order.</p>
             </div>
        )
    }


    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
             <ImagePreviewModal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} imageUrl={previewImage} title="Artwork Preview"/>
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <Hash className="w-8 h-8 text-primary"/>
                    Order <span className="font-mono text-primary">{order.orderId}</span>
                </h1>
                <p className="text-muted-foreground mt-1">Placed on {new Date(order.orderDate).toLocaleDateString()}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <Truck className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Customer</CardTitle>
                        <User className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                       <p className="text-lg font-bold">{order.customerName}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                       <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Package className="w-5 h-5 mr-2"/> Items in this order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {order.items.map((item, index) => (
                        <div key={item.id || index} className="flex items-center space-x-4 p-4 rounded-lg bg-secondary/50 border border-border">
                            <div 
                                className="w-24 h-24 checkerboard rounded-md border border-border flex-shrink-0 overflow-hidden cursor-zoom-in group relative"
                                onClick={() => setPreviewImage(item.originalSheetUrl)}
                            >
                                <img src={item.originalSheetUrl} alt={item.sheetSizeName} className="object-contain w-full h-full" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ZoomIn className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-foreground">{item.sheetSizeName}</p>
                                <p className="text-sm text-muted-foreground">{item.sheetWidth}" x {item.sheetHeight}"</p>
                                <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                            </div>
                            <p className="font-bold text-lg text-foreground">{formatCurrency(item.sheetPrice * item.quantity)}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>

             <div className="mt-8 flex justify-center">
                <Button asChild variant="outline">
                    <Link href="/dashboard">
                        Back to Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default function OrderDetailsPage() {
    return (
        <Suspense fallback={<div>Loading order...</div>}>
            <OrderDetailsContent />
        </Suspense>
    );
}
