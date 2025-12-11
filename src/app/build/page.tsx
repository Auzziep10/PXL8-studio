
'use client';

import GangSheetBuilder from '@/components/gang-sheet-builder';
import { useCart } from '@/hooks/use-cart';
import { useEffect } from 'react';

export default function BuildPage() {
    // We get the temporary artwork and the function to clear it from the cart context
    const { tempArtwork, clearTempArtwork } = useCart();

    // When the component mounts, if there is temporary artwork,
    // we "handle" it by passing it to the builder.
    // We rely on the builder's own useEffect to process this.
    // After it's passed, we clear it so it doesn't get added again on re-render.
    useEffect(() => {
        if (tempArtwork) {
            // The GangSheetBuilder will now receive this as a prop and add it to its canvas.
            // After we pass it, we clear it from the shared state.
            clearTempArtwork();
        }
    }, [tempArtwork, clearTempArtwork]);

    return (
        <div className="h-full flex flex-col">
            <GangSheetBuilder 
                usage="Builder" 
                // Pass the temporary artwork directly to the builder.
                // The builder needs to be updated to handle this prop.
                newArtworks={tempArtwork ? [tempArtwork] : []}
                onArtworkHandled={() => {
                    // This function is called by the builder once it has consumed the artwork,
                    // but we are now clearing it immediately in the useEffect.
                    // We can leave this prop for now or refactor the builder to remove it.
                }}
            />
        </div>
    );
}
