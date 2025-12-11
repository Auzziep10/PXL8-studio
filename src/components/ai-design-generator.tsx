'use client';

import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { generateDesign } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Wand2, Sparkles, AlertTriangle, Scissors } from 'lucide-react';
import { Artwork, ServiceCartItem, ServiceAddOn } from '@/lib/types';
import GangSheetBuilder from './gang-sheet-builder';
import { removeBackground } from '@/ai/flows/remove-background';
import { useCart } from '@/hooks/use-cart';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

interface AiDesignGeneratorProps {
    onDesignGenerated: (artwork: Artwork) => void;
}

export default function AiDesignGenerator({ onDesignGenerated }: AiDesignGeneratorProps) {
    const { addItem: addToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [view, setView] = useState<'generate' | 'edit'>('generate');
    
    // Fetch service add-ons to find the AI design fee
    const addOnsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'serviceAddOns'), where('name', '==', 'AI Design Creation'));
    }, [firestore]);

    const { data: aiDesignService, isLoading: isLoadingService } = useCollection<ServiceAddOn & { id: string }>(addOnsQuery);

    const aiDesignFeeProduct = useMemo(() => {
        if (aiDesignService && aiDesignService.length > 0) {
            const service = aiDesignService[0];
            return {
                id: service.id,
                type: 'service' as const,
                name: service.name,
                price: service.price,
            };
        }
        return null;
    }, [aiDesignService]);

    const handleGenerate = async () => {
        if (!prompt) {
            toast({
                variant: 'destructive',
                title: 'Prompt is required',
                description: 'Please enter a description for the design you want to create.',
            });
            return;
        }

        if (!aiDesignFeeProduct && !isLoadingService) {
             toast({
                variant: 'destructive',
                title: 'Pricing Error',
                description: 'AI Design pricing is not configured. Please contact support.',
            });
            return;
        }

        setIsLoading(true);
        setGeneratedImage(null);

        try {
            const result = await generateDesign({ prompt });
            if (result.success && result.data?.imageDataUri) {
                setGeneratedImage(result.data.imageDataUri);
                setView('edit');
                toast({
                    title: 'Design Generated!',
                    description: 'Your new design is ready.',
                });
            } else {
                throw new Error(result.error || 'Failed to generate design.');
            }
        } catch (error) {
            console.error('Error generating design:', error);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: (error as Error).message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRemoveBackground = async () => {
        if (!generatedImage) return;

        setIsRemovingBg(true);
        try {
            const result = await removeBackground({ imageDataUri: generatedImage });
            if (result && result.imageDataUri) {
                setGeneratedImage(result.imageDataUri);
                toast({
                    title: 'Background Removed',
                    description: 'The background has been successfully removed.',
                });
            } else {
                throw new Error('Failed to remove background.');
            }
        } catch (error) {
            console.error('Error removing background:', error);
            toast({
                variant: 'destructive',
                title: 'Background Removal Failed',
                description: (error as Error).message || 'An unexpected error occurred.',
            });
        } finally {
            setIsRemovingBg(false);
        }
    };

    const handleAddArtToSheet = () => {
        if (!generatedImage || !aiDesignFeeProduct) {
             toast({
                variant: 'destructive',
                title: 'Cannot Add Artwork',
                description: !generatedImage ? 'No image has been generated.' : 'AI pricing is not available.',
            });
            return;
        };

        // 1. Create the visual artwork to be added to the builder
        const newArtwork: Artwork = {
            id: `ai-${Date.now()}`,
            name: prompt.substring(0, 30) || 'AI Design',
            imageUrl: generatedImage,
            width: 5, // Default size, can be adjusted by user
            height: 5,
            dpi: 300,
        };
        
        // 2. Add the artwork to the gang sheet builder canvas
        onDesignGenerated(newArtwork);

        // 3. Add the corresponding service fee to the cart
        addToCart({
            ...aiDesignFeeProduct,
            quantity: 1, // Add one fee per creation
        });


        toast({
            title: 'Artwork Added & Fee Applied',
            description: `The design is on your sheet, and a ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aiDesignFeeProduct.price)} fee is in your cart.`,
        });

        // Switch to the builder view so the user can see their new art
        document.querySelector<HTMLButtonElement>('button[data-radix-collection-item][value="builder"]')?.click();
    };


    const generationFeeText = isLoadingService
        ? 'Loading pricing...'
        : aiDesignFeeProduct
        ? `Each generation added to a sheet costs ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aiDesignFeeProduct.price)}.`
        : 'AI design pricing not configured.';

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Card className="glass-panel border-white/10">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                        <Wand2 className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">AI Design Studio</CardTitle>
                    <CardDescription className="text-zinc-400">
                        Describe the design you want to create, and our AI will generate it for you. {generationFeeText}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {view === 'generate' ? (
                         <div>
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., A fierce eagle with a crown, vintage comic book style"
                                className="min-h-[100px] text-base"
                                disabled={isLoading}
                            />
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading || isLoadingService || !aiDesignFeeProduct}
                                className="w-full mt-4 text-lg py-6"
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                                        Generating...
                                    </span>
                                ) : (
                                    'Generate Design'
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 text-center">
                            <div className="bg-checkerboard-dark rounded-xl border border-white/10 p-4 aspect-square max-w-lg mx-auto">
                                <img src={generatedImage!} alt="AI Generated Design" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex justify-center gap-4">
                                <Button onClick={handleAddArtToSheet} className="text-base" size="lg">
                                    <ImagePlus className="w-5 h-5 mr-2" /> Add to Gang Sheet
                                </Button>
                                <Button onClick={handleRemoveBackground} variant="outline" className="text-base" disabled={isRemovingBg}>
                                    <Scissors className="w-5 h-5 mr-2" />
                                    {isRemovingBg ? 'Removing...' : 'Remove Background'}
                                </Button>
                                <Button onClick={() => setView('generate')} variant="secondary" className="text-base">
                                    <Wand2 className="w-5 h-5 mr-2" /> Generate Another
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="text-xs text-zinc-500 p-3 bg-zinc-900/50 rounded-lg flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                        <span>
                            AI-generated images are provided at approximately 300 DPI at 5"x5". Larger sizes may result in quality loss. 
                            Always review the final placement on the gang sheet.
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
