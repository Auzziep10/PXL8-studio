
'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import AiDesignGenerator from '@/components/ai-design-generator';
import type { Artwork } from '@/lib/types';

function DesignStudioContent() {
    const router = useRouter();
    const { addTempArtwork } = useCart();

    const handleDesignGenerated = (artwork: Omit<Artwork, 'id'>, target: 'builder' | 'transfers') => {
        // Add the temporary artwork to our shared state
        addTempArtwork(artwork);

        // Redirect to the appropriate page
        if (target === 'builder') {
            router.push('/build');
        } else {
            router.push('/track');
        }
    };

    return (
        <AiDesignGenerator onDesignGenerated={handleDesignGenerated} />
    );
}

export default function DesignStudioPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-zinc-400">Loading Design Studio...</p>
                </div>
            </div>
        }>
            <DesignStudioContent />
        </Suspense>
    );
}
