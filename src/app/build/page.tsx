
'use client';

import GangSheetBuilder from '@/components/gang-sheet-builder';

export default function BuildPage() {
    // The GangSheetBuilder component will now directly handle the tempArtwork from the useCart hook.
    return (
        <div className="h-full flex flex-col">
            <GangSheetBuilder usage="Builder" />
        </div>
    );
}
