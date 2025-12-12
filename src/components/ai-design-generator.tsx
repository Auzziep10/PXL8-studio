'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { generateDesign, GenerateDesignFromPromptInput } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Wand2, Sparkles, AlertTriangle, Scissors, ArrowRight, CaseSensitive, RefreshCw, Droplet } from 'lucide-react';
import { Artwork, ServiceAddOn } from '@/lib/types';
import { useCart } from '@/hooks/use-cart';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { sanitizeFilename } from '@/lib/utils';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';


// --- Dropdown Options ---
const styleOptions = ["Minimalist", "Vintage", "Cartoon", "Geometric", "Line Art", "Modern", "Badge", "8-bit Pixel Art", "Art Deco"];
const colorOptions = ["Black & White", "Vibrant & Neon", "Earth Tones", "Pastel", "Monochromatic Blue", "Primary Colors", "Gradients"];
const moodOptions = ["Playful", "Serious", "Energetic", "Calm", "Bold", "Elegant", "Futuristic", "Retro"];
const fontOptions = ["Arial", "Verdana", "Georgia", "Times New Roman", "Courier New", "Impact", "Comic Sans MS"];


interface AiDesignGeneratorProps {
  onDesignGenerated: (artwork: Omit<Artwork, 'id'>, target: 'builder' | 'transfers') => void;
}

interface TextItem {
    id: string;
    content: string;
    font: string;
    fontSize: number;
    color: string;
    x: number;
    y: number;
}


// --- Component ---
export default function AiDesignGenerator({ onDesignGenerated }: AiDesignGeneratorProps) {
    const { addItem: addToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    // --- State Management ---
    const [formData, setFormData] = useState<GenerateDesignFromPromptInput>({ subject: '', style: '', colors: '', mood: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<HTMLImageElement | null>(null);
    const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
    const [view, setView] = useState<'generate' | 'edit'>('generate');

    // --- Magic Wand State ---
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    const [bgRemovalTolerance, setBgRemovalTolerance] = useState(20);

    // --- Text State ---
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [activeTextId, setActiveTextId] = useState<string | null>(null);
    
    // --- Canvas & Dragging State ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const addOnsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'serviceAddOns'), where('name', '==', 'AI Design Creation'));
    }, [firestore]);

    const { data: aiDesignService, isLoading: isLoadingService } = useCollection<ServiceAddOn & { id: string }>(addOnsQuery);

    const aiDesignFeeProduct = useMemo(() => {
        if (aiDesignService && aiDesignService.length > 0) {
            const service = aiDesignService[0];
            return { id: service.id, type: 'service' as const, name: service.name, price: service.price };
        }
        return null;
    }, [aiDesignService]);

    const activeTextItem = useMemo(() => textItems.find(t => t.id === activeTextId), [textItems, activeTextId]);

    // --- Canvas Drawing Logic ---
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background image
        if (generatedImage) {
            ctx.drawImage(generatedImage, 0, 0, canvas.width, canvas.height);
        }

        // Draw each text item
        textItems.forEach(text => {
            ctx.font = `${text.fontSize}px ${text.font}`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text.content, text.x, text.y);
        });

    }, [generatedImage, textItems]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);


    // --- Core Actions ---
    const handleGenerate = async () => {
        const { subject, style, colors, mood } = formData;
        if (!subject || !style || !colors || !mood) {
            toast({ variant: 'destructive', title: 'All fields are required' });
            return;
        }
        if (!aiDesignFeeProduct && !isLoadingService) {
             toast({ variant: 'destructive', title: 'Pricing Error' });
             return;
        }

        setIsLoading(true);
        setGeneratedImage(null);
        setGeneratedImageDataUri(null);
        setTextItems([]);

        try {
            const result = await generateDesign(formData);
            if (result.success && result.data?.imageDataUri) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    setGeneratedImage(img);
                    setGeneratedImageDataUri(result.data!.imageDataUri);
                    setView('edit');
                    toast({ title: 'Design Generated!', description: 'Your new design is ready for edits.' });
                };
                img.src = result.data.imageDataUri;
            } else {
                throw new Error(result.error || 'Failed to generate design.');
            }
        } catch (error) {
            console.error('Error generating design:', error);
            toast({ variant: 'destructive', title: 'Generation Failed', description: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendToPage = (target: 'builder' | 'transfers') => {
        const canvas = canvasRef.current;
        if (!canvas || !aiDesignFeeProduct) {
             toast({ variant: 'destructive', title: 'Cannot Proceed' });
             return;
        };
        
        const finalImageDataUrl = canvas.toDataURL('image/png');
        const promptSummary = `${formData.subject} ${formData.style}`.trim();

        const newArtwork: Omit<Artwork, 'id'> = {
            name: sanitizeFilename(promptSummary) || 'ai-design',
            imageUrl: finalImageDataUrl,
            width: 5,
            height: 5,
            dpi: 300,
        };

        addToCart({ ...aiDesignFeeProduct, quantity: 1 });
        onDesignGenerated(newArtwork, target);
        
        toast({
            title: 'Artwork Sent!',
            description: `The design is ready on the ${target} page, and a fee is in your cart.`,
        });

        // Reset state
        setView('generate');
        setGeneratedImage(null);
        setGeneratedImageDataUri(null);
        setTextItems([]);
        setActiveTextId(null);
        setFormData({ subject: '', style: '', colors: '', mood: '' });
    };
    
    // --- Background Removal ---
    const handleCanvasClickForBgRemoval = async (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isRemovingBg || !generatedImage) return;

      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) return;

      tempCanvas.width = generatedImage.width;
      tempCanvas.height = generatedImage.height;
      tempCtx.drawImage(generatedImage, 0, 0);

      const clickedPixelX = Math.floor(x * (generatedImage.width / canvas.offsetWidth));
      const clickedPixelY = Math.floor(y * (generatedImage.height / canvas.offsetHeight));
      const pixelData = tempCtx.getImageData(clickedPixelX, clickedPixelY, 1, 1).data;
      
      if (pixelData[3] === 0) {
          toast({ title: "Already Transparent", description: "You clicked on a transparent area." });
          return;
      }

      const [r, g, b] = pixelData;
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
          const diff = Math.sqrt(Math.pow(data[i] - r, 2) + Math.pow(data[i+1] - g, 2) + Math.pow(data[i+2] - b, 2));
          if (diff < bgRemovalTolerance) {
              data[i + 3] = 0;
          }
      }
      tempCtx.putImageData(imageData, 0, 0);

      const newDataUrl = tempCanvas.toDataURL('image/png');
      const newImg = new Image();
      newImg.onload = () => {
          setGeneratedImage(newImg);
          setGeneratedImageDataUri(newDataUrl);
      };
      newImg.src = newDataUrl;

      toast({ title: 'Color Removed!', description: 'The selected color has been made transparent.' });
    };


    // --- Text Manipulation ---
    const handleAddText = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const newText: TextItem = {
            id: `text-${Date.now()}`,
            content: 'New Text',
            font: 'Arial',
            fontSize: 40,
            color: '#000000',
            x: canvas.width / 2,
            y: canvas.height / 2,
        };
        setTextItems(prev => [...prev, newText]);
        setActiveTextId(newText.id);
    };
    
    const updateActiveText = (updates: Partial<TextItem>) => {
        if (!activeTextId) return;
        setTextItems(prev => prev.map(t => t.id === activeTextId ? { ...t, ...updates } : t));
    };

    const deleteActiveText = () => {
        if (!activeTextId) return;
        setTextItems(prev => prev.filter(t => t.id !== activeTextId));
        setActiveTextId(null);
    };

    // --- Canvas Event Handlers ---
    const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isRemovingBg) {
            handleCanvasClickForBgRemoval(e);
            return;
        }
        
        const coords = getCoords(e);
        if (!coords || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Check if clicking on any text item (in reverse order for layering)
        for (let i = textItems.length - 1; i >= 0; i--) {
            const text = textItems[i];
            ctx.font = `${text.fontSize}px ${text.font}`;
            const metrics = ctx.measureText(text.content);
            const textWidth = metrics.width;
            const textHeight = text.fontSize; // Approximation

            if (
                coords.x >= text.x - textWidth / 2 &&
                coords.x <= text.x + textWidth / 2 &&
                coords.y >= text.y - textHeight / 2 &&
                coords.y <= text.y + textHeight / 2
            ) {
                setActiveTextId(text.id);
                setDraggingTextId(text.id);
                setDragOffset({
                    x: coords.x - text.x,
                    y: coords.y - text.y
                });
                return; // Stop after finding the top-most text
            }
        }
        
        // If no text was clicked, deselect
        setActiveTextId(null);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCoords(e);
        if (!coords || !draggingTextId) return;

        updateActiveText({
            x: coords.x - dragOffset.x,
            y: coords.y - dragOffset.y,
        });
    };

    const handleCanvasMouseUp = () => {
        setDraggingTextId(null);
    };


    const generationFeeText = isLoadingService
        ? 'Loading pricing...'
        : aiDesignFeeProduct
        ? `Each generation costs ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aiDesignFeeProduct.price)}. The fee is added to your cart when you use the design.`
        : 'AI design pricing not configured.';

    // --- Render Logic ---
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <Card className="glass-panel border-white/10">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">AI Design Studio</CardTitle>
                    <CardDescription className="text-zinc-400">{generationFeeText}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {view === 'generate' ? (
                         <div className="space-y-4">
                             <div>
                                <Label>Subject</Label>
                                <Input 
                                    placeholder="e.g., A robot surfing on a slice of pizza"
                                    value={formData.subject}
                                    onChange={(e) => setFormData(p => ({...p, subject: e.target.value}))}
                                    disabled={isLoading}
                                />
                             </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>Style</Label>
                                    <Select onValueChange={(value) => setFormData(p => ({ ...p, style: value }))} disabled={isLoading}>
                                        <SelectTrigger><SelectValue placeholder="e.g., Minimalist" /></SelectTrigger>
                                        <SelectContent>{styleOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
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
                            <Button onClick={handleGenerate} disabled={isLoading || isLoadingService || !aiDesignFeeProduct} className="w-full mt-4 text-lg py-6">
                                {isLoading ? <Wand2 className="w-5 h-5 mr-2 animate-pulse" /> : 'Generate Design'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                             <div className={cn("bg-checkerboard-dark rounded-xl border border-white/10 p-2 mx-auto aspect-square max-w-lg", isRemovingBg ? 'cursor-eyedropper' : 'cursor-move')}>
                                <canvas
                                    ref={canvasRef}
                                    width={512}
                                    height={512}
                                    className="w-full h-full object-contain"
                                    onMouseDown={handleCanvasMouseDown}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseUp={handleCanvasMouseUp}
                                    onMouseLeave={handleCanvasMouseUp}
                                />
                            </div>
                             
                             <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-zinc-300"><CaseSensitive className="w-4 h-4"/> Text Editor</Label>
                                    <Button onClick={handleAddText} size="sm" variant="secondary">Add Text</Button>
                                </div>
                                
                                {activeTextItem && (
                                    <div className="p-4 bg-background/30 rounded-lg space-y-4 animate-in fade-in">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="text-content">Text</Label>
                                                <Input id="text-content" value={activeTextItem.content} onChange={(e) => updateActiveText({ content: e.target.value })} />
                                            </div>
                                            <div>
                                                <Label htmlFor="text-font">Font</Label>
                                                 <Select value={activeTextItem.font} onValueChange={(v) => updateActiveText({ font: v })}>
                                                    <SelectTrigger id="text-font"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{fontOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                            <div>
                                                <Label htmlFor="text-size">Size: {activeTextItem.fontSize}px</Label>
                                                <Slider id="text-size" min={10} max={150} step={1} value={[activeTextItem.fontSize]} onValueChange={([v]) => updateActiveText({ fontSize: v })} />
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Label htmlFor="text-color">Color</Label>
                                                <Input id="text-color" type="color" value={activeTextItem.color} onChange={(e) => updateActiveText({ color: e.target.value })} className="p-1 h-10 w-16" />
                                                <Button onClick={deleteActiveText} variant="destructive" size="sm">Delete</Button>
                                            </div>
                                         </div>
                                    </div>
                                )}
                             </div>

                             <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 space-y-4">
                                <Label className="flex items-center gap-2 text-zinc-300"><Droplet className="w-4 h-4"/> Image Tools</Label>
                                <div className="space-y-3 pt-2">
                                    <Button variant={isRemovingBg ? "destructive" : "outline"} onClick={() => setIsRemovingBg(!isRemovingBg)}>
                                        <Droplet className="w-4 h-4 mr-2" />
                                        {isRemovingBg ? 'Cancel' : 'Magic Wand Tool'}
                                    </Button>
                                    {isRemovingBg && (
                                        <div className="bg-secondary/50 p-3 rounded-lg space-y-2 animate-in fade-in">
                                            <p className="text-xs text-muted-foreground">Click a color on the artwork preview to make it transparent.</p>
                                            <div>
                                                <Label className="text-xs">Tolerance: {bgRemovalTolerance}</Label>
                                                <Slider 
                                                    value={[bgRemovalTolerance]} 
                                                    onValueChange={([val]) => setBgRemovalTolerance(val)}
                                                    max={100} 
                                                    step={1}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                             </div>

                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button onClick={() => handleSendToPage('builder')} className="text-base" size="lg">
                                    <ImagePlus className="w-5 h-5 mr-2" /> Add to Gang Sheet
                                </Button>
                                <Button onClick={() => handleSendToPage('transfers')} className="text-base" size="lg" variant="secondary">
                                    <ArrowRight className="w-5 h-5 mr-2" /> Order as Single Transfer
                                </Button>
                            </div>
                            <div className="flex justify-center">
                                <Button onClick={() => setView('generate')} variant="ghost" className="text-base">
                                    <Wand2 className="w-5 h-5 mr-2" /> Generate Another
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="text-xs text-zinc-500 p-3 bg-zinc-900/50 rounded-lg flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                        <span>AI-generated images are provided at 512x512 pixels (approx 300 DPI at 1.7"x1.7"). Larger sizes may result in quality loss.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}