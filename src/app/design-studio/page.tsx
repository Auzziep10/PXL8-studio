
'use client';

import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import AiDesignGenerator from '@/components/ai-design-generator';
import type { Artwork } from '@/lib/types';

export default function DesignStudioPage() {
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
