
'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { generateDesign, GenerateDesignFromPromptInput } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, Wand2, Sparkles, AlertTriangle, Scissors, ArrowRight, CaseSensitive, RefreshCw, Droplet, User, Undo, ZoomIn, Move, RotateCw, Upload, Bold, Baseline, Paintbrush, Spline, Filter, ArrowLeft } from 'lucide-react';
import { Artwork, ServiceAddOn } from '@/lib/types';
import { useCart } from '@/hooks/use-cart';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { sanitizeFilename } from '@/lib/utils';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { textContent } from '@/lib/text-content';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


// --- Dropdown Options ---
const fontOptions = [
    "Arial", "Verdana", "Georgia", "Times New Roman", "Courier New", 
    "Impact", "Comic Sans MS", "Lobster", "Roboto", "Montserrat", "Oswald", 
    "Pacifico", "Bangers", "Anton", "Poppins", "Helvetica", "Garamond",
    "Futura", "Bodoni", "Didot", "Rockwell", "Franklin Gothic", "Baskerville",
    "Lato", "Open Sans", "Source Sans Pro"
];
const styleOptions = ["Minimalist", "Vintage", "Cartoon", "Geometric", "Line Art", "Modern", "Badge", "8-bit Pixel Art", "Art Deco", "Abstract", "Graffiti"];
const colorOptions = ["Black & White", "Vibrant & Neon", "Earth Tones", "Pastel", "Monochromatic Blue", "Primary Colors", "Gradients", "Duotone"];
const moodOptions = ["Playful", "Serious", "Energetic", "Calm", "Bold", "Elegant", "Futuristic", "Retro", "Whimsical", "Aggressive"];


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
    rotation: number;
    // New properties for advanced effects
    strokeWidth: number;
    strokeColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowColor: string;
    bend: number; // For arc warping
}

interface ImageTransform {
    scale: number;
    x: number;
    y: number;
    rotation: number;
    brightness: number;
    contrast: number;
    saturate: number;
    grayscale: number;
    sepia: number;
    blur: number;
}


// --- Component ---
export default function AiDesignGenerator({ onDesignGenerated }: AiDesignGeneratorProps) {
    const { addItem: addToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- State Management ---
    const [mode, setMode] = useState<'select' | 'upload' | 'ai'>('select');
    const [formData, setFormData] = useState<GenerateDesignFromPromptInput>({ subject: '', style: '', colors: '', mood: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<HTMLImageElement | null>(null);
    const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
    const [view, setView] = useState<'generate' | 'edit'>('generate');

    // --- Magic Wand State ---
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    const [bgRemovalTolerance, setBgRemovalTolerance] = useState(20);
    const [imageHistory, setImageHistory] = useState<string[]>([]);


    // --- Text State ---
    const [textItems, setTextItems] = useState<TextItem[]>([]);
    const [activeTextId, setActiveTextId] = useState<string | null>(null);
    
    // --- Canvas & Dragging State ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const initialImageTransform: ImageTransform = {
        scale: 1, x: 0, y: 0, rotation: 0,
        brightness: 100, contrast: 100, saturate: 100,
        grayscale: 0, sepia: 0, blur: 0,
    };
    const [imageTransform, setImageTransform] = useState<ImageTransform>(initialImageTransform);
    const [draggingImage, setDraggingImage] = useState(false);


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
    
        // Draw background image with transformations and filters
        if (generatedImage) {
            const { scale, x, y, rotation, brightness, contrast, saturate, grayscale, sepia, blur } = imageTransform;
            
            // Correctly calculate scaled dimensions while preserving aspect ratio
            const canvasAspectRatio = canvas.width / canvas.height;
            const imageAspectRatio = generatedImage.naturalWidth / generatedImage.naturalHeight;
            
            let renderWidth, renderHeight;
            if (canvasAspectRatio > imageAspectRatio) {
                renderHeight = canvas.height;
                renderWidth = renderHeight * imageAspectRatio;
            } else {
                renderWidth = canvas.width;
                renderHeight = renderWidth / imageAspectRatio;
            }

            const scaledWidth = renderWidth * scale;
            const scaledHeight = renderHeight * scale;
            
            const finalX = (canvas.width - scaledWidth) / 2 + x;
            const finalY = (canvas.height - scaledHeight) / 2 + y;
    
            ctx.save();
            // Apply filters
            ctx.filter = `
                brightness(${brightness}%)
                contrast(${contrast}%)
                saturate(${saturate}%)
                grayscale(${grayscale}%)
                sepia(${sepia}%)
                blur(${blur}px)
            `;

            ctx.translate(canvas.width / 2 + x, canvas.height / 2 + y);
            ctx.rotate(rotation * Math.PI / 180);
            ctx.translate(-(canvas.width / 2 + x), -(canvas.height / 2 + y));
            ctx.drawImage(generatedImage, finalX, finalY, scaledWidth, scaledHeight);
            ctx.restore();
        }
    
        // Draw each text item
        textItems.forEach(text => {
            ctx.save();

            // Set shadow properties BEFORE drawing
            ctx.shadowColor = text.shadowColor;
            ctx.shadowBlur = text.shadowBlur;
            ctx.shadowOffsetX = text.shadowOffsetX;
            ctx.shadowOffsetY = text.shadowOffsetY;
            
            // Set styles
            ctx.font = `${text.fontSize}px ${text.font}`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Handle Warping (Arc)
            if (text.bend !== 0) {
                const textWidth = ctx.measureText(text.content).width;
                const radius = (textWidth * 180) / (Math.abs(text.bend) * Math.PI);
                const angle = textWidth / radius;
                
                ctx.translate(text.x, text.y);
                ctx.rotate(text.rotation * Math.PI / 180);
                
                if (text.bend > 0) { // Arc up
                    ctx.translate(0, radius);
                    for (let i = 0; i < text.content.length; i++) {
                        const char = text.content[i];
                        const charWidth = ctx.measureText(char).width;
                        ctx.rotate(charWidth / 2 / radius);
                        ctx.fillText(char, 0, -radius);
                        ctx.strokeText(char, 0, -radius);
                        ctx.rotate(charWidth / 2 / radius);
                    }
                } else { // Arc down
                    ctx.translate(0, -radius);
                    for (let i = 0; i < text.content.length; i++) {
                        const char = text.content[i];
                        const charWidth = ctx.measureText(char).width;
                        ctx.rotate(-charWidth / 2 / radius);
                        ctx.fillText(char, 0, radius);
                        ctx.strokeText(char, 0, radius);
                        ctx.rotate(-charWidth / 2 / radius);
                    }
                }

            } else {
                 // Standard (non-warped) text rendering
                ctx.translate(text.x, text.y);
                ctx.rotate(text.rotation * Math.PI / 180);

                // Draw filled text
                ctx.fillText(text.content, 0, 0);

                // Draw outline if needed
                if (text.strokeWidth > 0) {
                    ctx.shadowColor = 'transparent'; // Clear shadow for stroke
                    ctx.strokeStyle = text.strokeColor;
                    ctx.lineWidth = text.strokeWidth;
                    ctx.strokeText(text.content, 0, 0);
                }
            }


            ctx.restore();
        });
    }, [generatedImage, textItems, imageTransform]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);


    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: 'Invalid File', description: 'Please select an image file.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                setGeneratedImage(img);
                setGeneratedImageDataUri(dataUrl);
                setImageHistory([dataUrl]);
                setTextItems([]);
                setImageTransform(initialImageTransform);
                setFormData({ subject: file.name, style: 'Custom', colors: '', mood: '' });
                setView('edit');
                toast({ title: 'Image Loaded', description: 'Your image is ready for editing.' });
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    };


    // --- Core Actions ---
    const handleGenerate = async () => {
        if (!user) {
             toast({ variant: 'destructive', title: 'Login Required', description: 'Please log in to generate AI designs.' });
             return;
        }

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
        setImageHistory([]);
        setImageTransform(initialImageTransform);

        try {
            const result = await generateDesign(formData);
            if (result.success && result.data?.imageDataUri) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => {
                    setGeneratedImage(img);
                    setGeneratedImageDataUri(result.data!.imageDataUri);
                    setImageHistory([result.data!.imageDataUri]);
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
        if (!canvas) return;

        const isAiGenerated = formData.style !== 'Custom';
        
        if (isAiGenerated && !aiDesignFeeProduct) {
             toast({ variant: 'destructive', title: 'Cannot Proceed', description: 'AI Design fee is not configured.' });
             return;
        };
        
        const finalImageDataUrl = canvas.toDataURL('image/png');
        const promptSummary = `${formData.subject} ${formData.style}`.trim();

        const newArtwork: Omit<Artwork, 'id'> = {
            name: sanitizeFilename(promptSummary) || 'design-studio-creation',
            imageUrl: finalImageDataUrl,
            width: 5,
            height: 5,
            dpi: 300,
        };

        if (isAiGenerated) {
            addToCart({ ...aiDesignFeeProduct!, quantity: 1 });
        }
        onDesignGenerated(newArtwork, target);
        
        toast({
            title: 'Artwork Sent!',
            description: `The design is ready on the ${target} page. ${isAiGenerated ? 'A fee is in your cart.' : ''}`,
        });

        // Reset state
        setView('generate');
        setMode('select');
        setGeneratedImage(null);
        setGeneratedImageDataUri(null);
        setTextItems([]);
        setActiveTextId(null);
        setFormData({ subject: '', style: '', colors: '', mood: '' });
        setImageTransform(initialImageTransform);
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
          setImageHistory(prev => [...prev, newDataUrl]);
      };
      newImg.src = newDataUrl;

      toast({ title: 'Color Removed!', description: 'The selected color has been made transparent.' });
    };

    const handleUndo = () => {
        if (imageHistory.length <= 1) return;
        
        const newHistory = [...imageHistory];
        newHistory.pop(); // Remove current state
        const previousUrl = newHistory[newHistory.length - 1]; // Get the new last state

        const newImg = new Image();
        newImg.onload = () => {
            setGeneratedImage(newImg);
            setGeneratedImageDataUri(previousUrl);
            setImageHistory(newHistory);
        };
        newImg.src = previousUrl;
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
            rotation: 0,
            strokeWidth: 0,
            strokeColor: '#ffffff',
            shadowBlur: 0,
            shadowColor: '#000000',
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            bend: 0,
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

            // This collision detection does not account for rotation.
            // A more complex check (e.g., rotating point) would be needed for perfect accuracy.
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
        
        // If no text was clicked, start dragging the image
        setDraggingImage(true);
        setActiveTextId(null);
        setDragOffset({
            x: coords.x - imageTransform.x,
            y: coords.y - imageTransform.y,
        });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCoords(e);
        if (!coords) return;
    
        if (draggingTextId) {
            updateActiveText({
                x: coords.x - dragOffset.x,
                y: coords.y - dragOffset.y,
            });
        } else if (draggingImage) {
            setImageTransform(prev => ({
                ...prev,
                x: coords.x - dragOffset.x,
                y: coords.y - dragOffset.y,
            }));
        }
    };

    const handleCanvasMouseUp = () => {
        setDraggingTextId(null);
        setDraggingImage(false);
    };

    const generationFeeText = isLoadingService
        ? 'Loading pricing...'
        : aiDesignFeeProduct
        ? textContent.ai_designer_fee_text.replace('{price}', new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aiDesignFeeProduct.price))
        : 'AI design pricing not configured.';

    // --- Render Logic ---
    return (
        <div className="h-full flex flex-col">
            <Card className="glass-panel border-border/10 flex-grow flex flex-col">
                {view === 'generate' && (
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">{textContent.ai_designer_title}</CardTitle>
                        <CardDescription className="text-muted-foreground">{generationFeeText}</CardDescription>
                    </CardHeader>
                )}
                <CardContent className="flex-grow flex flex-col min-h-0">
                    {view === 'generate' ? (
                         <div className="space-y-6 max-w-2xl mx-auto w-full my-auto">
                            {mode === 'select' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center animate-in fade-in">
                                    <div 
                                        onClick={() => {
                                            setMode('upload');
                                            fileInputRef.current?.click();
                                        }}
                                        className="glass-panel p-8 rounded-2xl border border-border/30 hover:border-primary/50 hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center space-y-4"
                                    >
                                        <Upload className="w-10 h-10 text-primary" />
                                        <h3 className="text-xl font-bold text-foreground">Upload Your Image</h3>
                                        <p className="text-sm text-muted-foreground">Bring your own artwork to edit and enhance.</p>
                                    </div>
                                    <div 
                                        onClick={() => setMode('ai')}
                                        className="glass-panel p-8 rounded-2xl border border-border/30 hover:border-primary/50 hover:-translate-y-1 transition-all cursor-pointer flex flex-col items-center justify-center space-y-4"
                                    >
                                        <Wand2 className="w-10 h-10 text-primary" />
                                        <h3 className="text-xl font-bold text-foreground">Generate with AI</h3>
                                        <p className="text-sm text-muted-foreground">Create a unique design from a text description.</p>
                                    </div>
                                </div>
                            )}

                             {mode !== 'select' && (
                                <Button onClick={() => setMode('select')} variant="ghost" className="mb-4">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to choices
                                </Button>
                             )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setMode('upload');
                                        handleFileSelect(e.target.files[0])
                                    }
                                }}
                                accept="image/*"
                            />
                            {mode === 'ai' && (
                                <div className="space-y-4 animate-in fade-in">
                                    {isUserLoading ? (
                                        <div className="h-10 bg-muted rounded-md animate-pulse" />
                                    ) : !user && (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex flex-col items-center text-center">
                                            <User className="w-8 h-8 text-yellow-500 mb-2" />
                                            <p className="text-sm font-medium text-foreground mb-2">Login to Create with AI</p>
                                            <p className="text-xs text-muted-foreground mb-4">You need to be logged in to generate designs with AI.</p>
                                            <Button asChild size="sm">
                                                <Link href="/auth/login">Login or Sign Up</Link>
                                            </Button>
                                        </div>
                                    )}
                                    <div>
                                        <Label>Subject (with AI)</Label>
                                        <Input 
                                            placeholder="e.g., A robot surfing on a slice of pizza"
                                            value={formData.subject}
                                            onChange={(e) => setFormData(p => ({...p, subject: e.target.value}))}
                                            disabled={isLoading || !user}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label>Style</Label>
                                            <Select onValueChange={(value) => setFormData(p => ({ ...p, style: value }))} disabled={isLoading || !user}>
                                                <SelectTrigger><SelectValue placeholder="e.g., Minimalist" /></SelectTrigger>
                                                <SelectContent>{styleOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Color Palette</Label>
                                            <Select onValueChange={(value) => setFormData(p => ({ ...p, colors: value }))} disabled={isLoading || !user}>
                                                <SelectTrigger><SelectValue placeholder="e.g., Black & White" /></SelectTrigger>
                                                <SelectContent>{colorOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Mood</Label>
                                            <Select onValueChange={(value) => setFormData(p => ({ ...p, mood: value }))} disabled={isLoading || !user}>
                                                <SelectTrigger><SelectValue placeholder="e.g., Playful" /></SelectTrigger>
                                                <SelectContent>{moodOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button onClick={handleGenerate} disabled={isLoading || isLoadingService || (formData.style !== 'Custom' && !aiDesignFeeProduct) || !user} className="w-full mt-4 text-lg py-6">
                                        {isLoading ? <Wand2 className="w-5 h-5 mr-2 animate-pulse" /> : <><Wand2 className="w-5 h-5 mr-2" />Generate with AI</>}
                                    </Button>
                                </div>
                            )}

                            {mode !== 'select' && (
                                 <div className="text-xs text-muted-foreground p-3 bg-secondary/50 rounded-lg flex items-start space-x-2 mt-6">
                                    <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <span>AI-generated images are provided at 512x512 pixels (approx 300 DPI at 1.7"x1.7"). Larger sizes may result in quality loss.</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8 flex-grow min-h-0">
                            <div className="md:col-span-1 h-full flex flex-col">
                                <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4 builder-scroll">
                                    <Accordion type="multiple" defaultValue={['item-1', 'item-2', 'item-3', 'item-4']} className="w-full">
                                        <AccordionItem value="item-1" className="bg-secondary/50 rounded-xl border border-border px-4 mb-4">
                                            <AccordionTrigger className="py-3 font-semibold text-foreground [&[data-state=open]>svg]:text-primary">
                                                <span className='flex items-center gap-2'><ZoomIn className="w-4 h-4"/> Image Transform</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 space-y-4">
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div>
                                                        <Label htmlFor="image-scale" className="text-xs">Scale: {imageTransform.scale.toFixed(2)}x</Label>
                                                        <Slider id="image-scale" min={0.1} max={3} step={0.05} value={[imageTransform.scale]} onValueChange={([v]) => setImageTransform(p => ({ ...p, scale: v }))} />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="image-rotation" className="text-xs">Rotation: {imageTransform.rotation.toFixed(0)}°</Label>
                                                        <Slider id="image-rotation" min={-180} max={180} step={1} value={[imageTransform.rotation]} onValueChange={([v]) => setImageTransform(p => ({...p, rotation: v}))} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Position (X, Y)</Label>
                                                        <div className="flex gap-2">
                                                            <Input type="number" value={imageTransform.x} onChange={e => setImageTransform(p => ({ ...p, x: parseInt(e.target.value) || 0}))} />
                                                            <Input type="number" value={imageTransform.y} onChange={e => setImageTransform(p => ({ ...p, y: parseInt(e.target.value) || 0}))} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button onClick={() => setImageTransform(p => ({ ...p, scale: 1, x: 0, y: 0, rotation: 0 }))} size="sm" variant="ghost">Reset Transform</Button>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="item-4" className="bg-secondary/50 rounded-xl border border-border px-4 mb-4">
                                            <AccordionTrigger className="py-3 font-semibold text-foreground [&[data-state=open]>svg]:text-primary">
                                                <span className='flex items-center gap-2'><Filter className="w-4 h-4"/> Image Filters</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 space-y-4">
                                                <div><Label className="text-xs">Brightness: {imageTransform.brightness}%</Label><Slider min={0} max={200} value={[imageTransform.brightness]} onValueChange={([v]) => setImageTransform(p => ({...p, brightness: v}))} /></div>
                                                <div><Label className="text-xs">Contrast: {imageTransform.contrast}%</Label><Slider min={0} max={200} value={[imageTransform.contrast]} onValueChange={([v]) => setImageTransform(p => ({...p, contrast: v}))} /></div>
                                                <div><Label className="text-xs">Saturation: {imageTransform.saturate}%</Label><Slider min={0} max={200} value={[imageTransform.saturate]} onValueChange={([v]) => setImageTransform(p => ({...p, saturate: v}))} /></div>
                                                <div><Label className="text-xs">Grayscale: {imageTransform.grayscale}%</Label><Slider min={0} max={100} value={[imageTransform.grayscale]} onValueChange={([v]) => setImageTransform(p => ({...p, grayscale: v}))} /></div>
                                                <div><Label className="text-xs">Sepia: {imageTransform.sepia}%</Label><Slider min={0} max={100} value={[imageTransform.sepia]} onValueChange={([v]) => setImageTransform(p => ({...p, sepia: v}))} /></div>
                                                <div><Label className="text-xs">Blur: {imageTransform.blur}px</Label><Slider min={0} max={10} step={0.5} value={[imageTransform.blur]} onValueChange={([v]) => setImageTransform(p => ({...p, blur: v}))} /></div>
                                                <Button onClick={() => setImageTransform(p => ({ ...p, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0 }))} size="sm" variant="ghost">Reset Filters</Button>
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="item-2" className="bg-secondary/50 rounded-xl border border-border px-4 mb-4">
                                            <AccordionTrigger className="py-3 font-semibold text-foreground [&[data-state=open]>svg]:text-primary">
                                                <span className='flex items-center gap-2'><CaseSensitive className="w-4 h-4"/> Text Tools</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 space-y-4">
                                                <Button onClick={handleAddText} size="sm" variant="secondary" className="w-full">Add Text</Button>
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
                                                        <div className="space-y-2">
                                                            <Label htmlFor="text-rotation" className="text-xs">Rotation: {activeTextItem.rotation.toFixed(0)}°</Label>
                                                            <Slider id="text-rotation" min={-180} max={180} step={1} value={[activeTextItem.rotation]} onValueChange={([v]) => updateActiveText({ rotation: v })} />
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
                                                        <Accordion type="multiple" className="w-full">
                                                            <AccordionItem value="stroke">
                                                                <AccordionTrigger className="text-xs py-2"><span className="flex items-center gap-2"><Baseline className="w-4 h-4"/>Outline</span></AccordionTrigger>
                                                                <AccordionContent className="space-y-3 pt-2">
                                                                    <div>
                                                                        <Label htmlFor="stroke-width" className="text-xs">Width: {activeTextItem.strokeWidth}px</Label>
                                                                        <Slider id="stroke-width" min={0} max={10} step={0.5} value={[activeTextItem.strokeWidth]} onValueChange={([v]) => updateActiveText({ strokeWidth: v })} />
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Label htmlFor="stroke-color" className="text-xs">Color</Label>
                                                                        <Input id="stroke-color" type="color" value={activeTextItem.strokeColor} onChange={(e) => updateActiveText({ strokeColor: e.target.value })} className="p-1 h-8 w-10 ml-auto" />
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                            <AccordionItem value="shadow">
                                                                <AccordionTrigger className="text-xs py-2"><span className="flex items-center gap-2"><Paintbrush className="w-4 h-4"/>Drop Shadow</span></AccordionTrigger>
                                                                <AccordionContent className="space-y-3 pt-2">
                                                                    <div>
                                                                        <Label htmlFor="shadow-blur" className="text-xs">Blur: {activeTextItem.shadowBlur}px</Label>
                                                                        <Slider id="shadow-blur" min={0} max={25} step={1} value={[activeTextItem.shadowBlur]} onValueChange={([v]) => updateActiveText({ shadowBlur: v })} />
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor="shadow-offset-x" className="text-xs">Offset X: {activeTextItem.shadowOffsetX}px</Label>
                                                                        <Slider id="shadow-offset-x" min={-20} max={20} step={1} value={[activeTextItem.shadowOffsetX]} onValueChange={([v]) => updateActiveText({ shadowOffsetX: v })} />
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor="shadow-offset-y" className="text-xs">Offset Y: {activeTextItem.shadowOffsetY}px</Label>
                                                                        <Slider id="shadow-offset-y" min={-20} max={20} step={1} value={[activeTextItem.shadowOffsetY]} onValueChange={([v]) => updateActiveText({ shadowOffsetY: v })} />
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Label htmlFor="shadow-color" className="text-xs">Color</Label>
                                                                        <Input id="shadow-color" type="color" value={activeTextItem.shadowColor} onChange={(e) => updateActiveText({ shadowColor: e.target.value })} className="p-1 h-8 w-10 ml-auto" />
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                            <AccordionItem value="warp" className="border-b-0">
                                                                <AccordionTrigger className="text-xs py-2"><span className="flex items-center gap-2"><Spline className="w-4 h-4"/>Warp</span></AccordionTrigger>
                                                                <AccordionContent className="space-y-3 pt-2">
                                                                    <div>
                                                                        <Label htmlFor="text-bend" className="text-xs">Bend: {activeTextItem.bend.toFixed(0)}</Label>
                                                                        <Slider id="text-bend" min={-100} max={100} step={1} value={[activeTextItem.bend]} onValueChange={([v]) => updateActiveText({ bend: v })} />
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        </Accordion>
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                        <AccordionItem value="item-3" className="bg-secondary/50 rounded-xl border border-border px-4 mb-4">
                                            <AccordionTrigger className="py-3 font-semibold text-foreground [&[data-state=open]>svg]:text-primary">
                                                <span className='flex items-center gap-2'><Droplet className="w-4 h-4"/> Background</span>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <Button variant={isRemovingBg ? "destructive" : "outline"} onClick={() => setIsRemovingBg(!isRemovingBg)}>
                                                        <Droplet className="w-4 h-4 mr-2" />
                                                        {isRemovingBg ? 'Cancel' : 'Magic Wand Tool'}
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={handleUndo} 
                                                        disabled={imageHistory.length <= 1}
                                                        title="Undo last background removal"
                                                    >
                                                        <Undo className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                                {isRemovingBg && (
                                                    <div className="bg-muted/50 p-3 rounded-lg space-y-2 animate-in fade-in">
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
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>
                            <div className="md:col-span-2 flex flex-col items-center justify-center">
                                <div className={cn("checkerboard rounded-xl border border-border p-2 mx-auto aspect-square max-w-lg w-full", isRemovingBg ? 'cursor-eyedropper' : (draggingImage ? 'cursor-grabbing' : 'cursor-grab'))}>
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
                                <div className="space-y-4 mt-6 w-full max-w-lg">
                                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                                        <Button onClick={() => handleSendToPage('builder')} className="text-base" size="lg">
                                            <ImagePlus className="w-5 h-5 mr-2" /> Add to Gang Sheet
                                        </Button>
                                        <Button onClick={() => handleSendToPage('transfers')} className="text-base" size="lg" variant="secondary">
                                            <ArrowRight className="w-5 h-5 mr-2" /> Order as Single Transfer
                                        </Button>
                                    </div>
                                    <div className="flex justify-center">
                                        <Button onClick={() => { setView('generate'); setMode('select'); }} variant="ghost" className="text-base">
                                            <Wand2 className="w-5 h-5 mr-2" /> Start Over
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
