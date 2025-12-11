
'use client';

import GangSheetBuilder from '@/components/gang-sheet-builder';
import AiDesignGenerator from '@/components/ai-design-generator';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Upload, Wand2 } from 'lucide-react';
import type { Artwork } from '@/lib/types';


export default function BuildPage() {
    const [newArtworks, setNewArtworks] = useState<Omit<Artwork, 'id'>[]>([]);

    const addArtworkToSheet = (artwork: Omit<Artwork, 'id'>) => {
        setNewArtworks(prev => [...prev, artwork]);
    };

    const onArtworkHandled = (artworkName: string) => {
        setNewArtworks(prev => prev.filter(art => art.name !== artworkName));
    };

    return (
        <Tabs defaultValue="builder" className="h-full flex flex-col">
            <div className="flex justify-center py-2">
                <TabsList>
                    <TabsTrigger value="builder"><Wand2 className="w-4 h-4 mr-2" /> Gang Sheet Builder</TabsTrigger>
                    <TabsTrigger value="ai"><Wand2 className="w-4 h-4 mr-2" /> AI Designer</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="builder" className="flex-grow">
                <GangSheetBuilder 
                    usage="Builder" 
                    newArtworks={newArtworks} 
                    onArtworkHandled={onArtworkHandled} 
                />
            </TabsContent>
            <TabsContent value="ai" className="flex-grow">
                <AiDesignGenerator onDesignGenerated={addArtworkToSheet} />
            </TabsContent>
        </Tabs>
    );
}
