'use client';

import { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { generateDesign, GenerateDesignFromPromptInput } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Wand2, Sparkles, AlertTriangle, Scissors, ArrowRight } from 'lucide-react';
import { Artwork, ServiceAddOn } from '@/lib/types';
import { removeBackground } from '@/ai/flows/remove-background';
import { useCart } from '@/hooks/use-cart';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { sanitizeFilename } from '@/lib/utils';

// --- Dropdown Options ---
const subjectOptions = ["Animals", "Nature", "Space", "Technology", "Fantasy", "Abstract", "Sports", "Food & Drink", "Mythology", "Skulls"];
const styleOptions = ["Minimalist", "Vintage", "Cartoon", "Geometric", "Line Art", "Modern", "Badge", "8-bit Pixel Art", "Art Deco"];
const colorOptions = ["Black & White", "Vibrant & Neon", "Earth Tones", "Pastel", "Monochromatic Blue", "Primary Colors", "Gradients"];
const moodOptions = ["Playful", "Serious", "Energetic", "Calm", "Bold", "Elegant", "Futuristic", "Retro"];

// --- Component ---
export default function AiDesignGenerator({ onDesignGenerated }: AiDesignGeneratorProps) {
    const { addItem: addToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [formData, setFormData] = useState<Omit<GenerateDesignFromPromptInput, 'text'>>({
        subject: '',
        style: '',
        colors: '',
        mood: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [view, setView] = useState<'generate' | 'edit'>('generate');
    
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
        const { subject, style, colors, mood } = formData;
        if (!subject || !style || !colors || !mood) {
            toast({
                variant: 'destructive',
                title: 'All fields are required',
                description: 'Please select an option from each dropdown to generate a design.',
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
            const result = await generateDesign(formData);
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

    const handleSendToPage = (target: 'builder' | 'transfers') => {
        if (!generatedImage || !aiDesignFeeProduct) {
             toast({
                variant: 'destructive',
                title: 'Cannot Proceed',
                description: !generatedImage ? 'No image has been generated.' : 'AI pricing is not available.',
            });
            return;
        };
        
        const promptSummary = `${formData.subject} ${formData.style}`;

        const newArtwork: Omit<Artwork, 'id'> = {
            name: sanitizeFilename(promptSummary) || 'ai-design',
            imageUrl: generatedImage,
            width: 5, // Default size
            height: 5,
            dpi: 300,
        };

        addToCart({
            ...aiDesignFeeProduct,
            quantity: 1,
        });

        onDesignGenerated(newArtwork, target);
        
        toast({
            title: 'Artwork Sent!',
            description: `The design is ready on the ${target} page, and a ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aiDesignFeeProduct.price)} fee is in your cart.`,
        });

        setView('generate');
        setGeneratedImage(null);
        setFormData({ subject: '', style: '', colors: '', mood: '' });
    };


    const generationFeeText = isLoadingService
        ? 'Loading pricing...'
        : aiDesignFeeProduct
        ? `Each generation costs ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aiDesignFeeProduct.price)}. The fee is added to your cart when you use the design.`
        : 'AI design pricing not configured.';

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Card className="glass-panel border-white/10">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">AI Design Studio</CardTitle>
                    <CardDescription className="text-zinc-400">
                        {generationFeeText}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {view === 'generate' ? (
                         <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Subject</Label>
                                    <Select onValueChange={(value) => setFormData(p => ({ ...p, subject: value }))} disabled={isLoading}>
                                        <SelectTrigger><SelectValue placeholder="e.g., Animals" /></SelectTrigger>
                                        <SelectContent>{subjectOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Style</Label>
                                    <Select onValueChange={(value) => setFormData(p => ({ ...p, style: value }))} disabled={isLoading}>
                                        <SelectTrigger><SelectValue placeholder="e.g., Minimalist" /></SelectTrigger>
                                        <SelectContent>{styleOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Color Palette</Label>
                                    <Select onValueChange={(value) => setFormData(p => ({ ...p, colors: value }))} disabled={isLoading}>
                                        <SelectTrigger><SelectValue placeholder="e.g., Black & White" /></SelectTrigger>
                                        <SelectContent>{colorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Mood</Label>
                                    <Select onValueChange={(value) => setFormData(p => ({ ...p, mood: value }))} disabled={isLoading}>
                                        <SelectTrigger><SelectValue placeholder="e.g., Playful" /></SelectTrigger>
                                        <SelectContent>{moodOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <Button
                                onClick={handleGenerate}
                                disabled={isLoading || isLoadingService || !aiDesignFeeProduct}
                                className="w-full mt-4 text-lg py-6"
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <Wand2 className="w-5 h-5 mr-2 animate-pulse" />
                                        Generating...
                                    </span>
                                ) : (
                                    'Generate Design'
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 text-center">
                            <div className="bg-checkerboard-dark rounded-xl border border-white/10 p-4 aspect-square max-w-lg mx-auto">
                                <img src={generatedImage!} alt="AI Generated Design" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button onClick={() => handleSendToPage('builder')} className="text-base" size="lg">
                                    <ImagePlus className="w-5 h-5 mr-2" /> Add to Gang Sheet
                                </Button>
                                <Button onClick={() => handleSendToPage('transfers')} className="text-base" size="lg" variant="secondary">
                                    <ArrowRight className="w-5 h-5 mr-2" /> Order as Single Transfer
                                </Button>
                            </div>
                            <div className="flex justify-center gap-4">
                                <Button onClick={handleRemoveBackground} variant="outline" className="text-base" disabled={isRemovingBg}>
                                    <Scissors className="w-5 h-5 mr-2" />
                                    {isRemovingBg ? 'Removing...' : 'Remove Background'}
                                </Button>
                                <Button onClick={() => setView('generate')} variant="ghost" className="text-base">
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

interface AiDesignGeneratorProps {
  onDesignGenerated: (artwork: Omit<Artwork, 'id'>, target: 'builder' | 'transfers') => void;
}
