
'use client';

import GangSheetBuilder from '@/components/gang-sheet-builder';

export default function BuildPage() {
    // The GangSheetBuilder component will now directly handle the tempArtwork from the useCart hook.
    // This simplifies the logic and prevents the previous duplication bug.
    return (
        <div className="h-full flex flex-col">
            <GangSheetBuilder usage="Builder" />
        </div>
    );
}
