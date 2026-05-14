'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useCart } from '@/hooks/use-cart';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
    const { clearCart } = useCart();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');

    const hasCleared = useRef(false);

    useEffect(() => {
        if (sessionId && !hasCleared.current) {
            clearCart();
            hasCleared.current = true;
        }
    }, [sessionId, clearCart]);

    return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            
            <h1 className="text-4xl font-bold text-foreground mb-4">Payment Successful!</h1>
            <p className="text-lg text-muted-foreground mb-8">
                Thank you for your order. We've received your payment and your designs are now being prepped for production.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button asChild size="lg">
                    <Link href="/dashboard">
                        Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
