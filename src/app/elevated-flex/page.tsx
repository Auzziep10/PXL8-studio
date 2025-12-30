
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DynamicSheetCartItem, ServiceAddOn, Artwork } from '@/lib/types';
import { Upload, FileText, ArrowRight, Trash2, ShieldCheck, Ruler, DollarSign, Percent, AlertTriangle, Droplet, Undo, Sparkles, Star, Zap } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { textContent } from '@/lib/text-content';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { ParallaxImage } from '@/components/ui/parallax-image';
import { ParallaxContainer } from '@/components/ui/parallax-container';

const elevatedFlexHero = PlaceHolderImages.find(p => p.id === 'elevatedFlexHero');
const elevatedFlexBenefit1 = PlaceHolderImages.find(p => p.id === 'elevatedFlexBenefit1');
const elevatedFlexBenefit2 = PlaceHolderImages.find(p => p.id === 'elevatedFlexBenefit2');
const elevatedFlexBenefit3 = PlaceHolderImages.find(p => p.id === 'elevatedFlexBenefit3');
const elevatedFlexVideo = PlaceHolderImages.find(p => p.id === 'elevatedFlexVideo');

const benefits = [
    {
        icon: <Sparkles className="h-8 w-8 text-accent" />,
        title: textContent.elevated_flex_benefit1_title,
        description: textContent.elevated_flex_benefit1_desc,
        image: elevatedFlexBenefit1
    },
    {
        icon: <Star className="h-8 w-8 text-accent" />,
        title: textContent.elevated_flex_benefit2_title,
        description: textContent.elevated_flex_benefit2_desc,
        image: elevatedFlexBenefit2
    },
    {
        icon: <Zap className="h-8 w-8 text-accent" />,
        title: textContent.elevated_flex_benefit3_title,
        description: textContent.elevated_flex_benefit3_desc,
        image: elevatedFlexBenefit3
    }
];

export default function ElevatedFlexPage() {
    const { addItem: onAddToCart, tempArtwork, clearTempArtwork } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const addOnsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'serviceAddOns'), where('type', '==', 'per_sq_inch')) : null),
        [firestore]
    );
    const { data: addOns, isLoading: isLoadingPrice } = useCollection<ServiceAddOn & {id: string}>(addOnsQuery);
    
    const pricePerSqInch = useMemo(() => {
        if (addOns && addOns.length > 0) {
            return addOns[0].price || null;
        }
        return null;
    }, [addOns]);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
    const [dimensions, setDimensions] = useState<{width: string, height: string}>({width: '', height: ''});
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // --- Magic Wand State ---
    const [isRemovingBg, setIsRemovingBg] = useState(false);
    const [bgRemovalTolerance, setBgRemovalTolerance] = useState(20);
    const [imageHistory, setImageHistory] = useState<string[]>([]);


    const imageAspectRatio = useRef<number | null>(null);

    
    // Effect to handle temporary artwork from AI generator
    useEffect(() => {
        if (tempArtwork) {
            handleIncomingArtwork(tempArtwork);
            clearTempArtwork();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tempArtwork]);


    useEffect(() => {
        const width = parseFloat(dimensions.width);
        const height = parseFloat(dimensions.height);

        if (width > 0 && height > 0 && pricePerSqInch !== null) {
            const area = width * height;
            const price = area * pricePerSqInch * quantity;
            setCalculatedPrice(price);
        } else {
            setCalculatedPrice(null);
        }
    }, [dimensions, quantity, pricePerSqInch]);

    const handleIncomingArtwork = (artwork: Omit<Artwork, 'id'>) => {
        setPreviewUrl(artwork.imageUrl);
        setImageHistory([artwork.imageUrl]);
        setDimensions({ width: artwork.width.toString(), height: artwork.height.toString() });

        const img = new Image();
        img.onload = () => {
             imageAspectRatio.current = img.naturalWidth / img.naturalHeight;
        };
        img.src = artwork.imageUrl;
        
        // We don't have a real file object, so we create a placeholder name
        setFile({ name: artwork.name } as File);
    };

    // --- Background Removal ---
    const handleBackgroundRemoval = async (e: React.MouseEvent<HTMLImageElement>) => {
        if (!isRemovingBg || !previewUrl) return;

        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) return;

        const sourceImage = new Image();
        sourceImage.crossOrigin = 'Anonymous';
        sourceImage.onload = () => {
            tempCanvas.width = sourceImage.naturalWidth;
            tempCanvas.height = sourceImage.naturalHeight;
            tempCtx.drawImage(sourceImage, 0, 0);

            const clickedPixelX = Math.floor(x * (sourceImage.naturalWidth / img.offsetWidth));
            const clickedPixelY = Math.floor(y * (sourceImage.naturalHeight / img.offsetHeight));
            const pixelData = tempCtx.getImageData(clickedPixelX, clickedPixelY, 1, 1).data;

            if (pixelData[3] === 0) {
                toast({ title: "Already Transparent", description: "You clicked on a transparent area." });
                return;
            }

            const [r, g, b] = pixelData;
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const diff = Math.sqrt(Math.pow(data[i] - r, 2) + Math.pow(data[i + 1] - g, 2) + Math.pow(data[i + 2] - b, 2));
                if (diff < bgRemovalTolerance) {
                    data[i + 3] = 0;
                }
            }
            tempCtx.putImageData(imageData, 0, 0);

            const newDataUrl = tempCanvas.toDataURL('image/png');
            setPreviewUrl(newDataUrl);
            setImageHistory(prev => [...prev, newDataUrl]);
            toast({ title: 'Color Removed!', description: 'The selected color has been made transparent.' });
        };
        sourceImage.src = previewUrl;
    };

    const handleUndo = () => {
        if (imageHistory.length <= 1) return;
        
        const newHistory = [...imageHistory];
        newHistory.pop(); // Remove current state
        const previousUrl = newHistory[newHistory.length - 1]; // Get the new last state

        setPreviewUrl(previousUrl);
        setImageHistory(newHistory);
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            
            if (!uploadedFile.type.startsWith('image/')) {
                 toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid image file (PNG, JPG, etc.).' });
                 return;
            }

            setFile(uploadedFile);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setPreviewUrl(result);
                setImageHistory([result]);

                const img = new Image();
                img.onload = () => {
                    imageAspectRatio.current = img.naturalWidth / img.naturalHeight;
                    // Auto-populate width to a default of 5 inches, height adjusts automatically
                    const defaultWidth = 5;
                    const correspondingHeight = defaultWidth / imageAspectRatio.current;
                    setDimensions({ width: String(defaultWidth), height: correspondingHeight.toFixed(2) });
                };
                img.src = result;
            };
            reader.readAsDataURL(uploadedFile);
        }
    };

    const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseFloat(value);

        if (imageAspectRatio.current) {
            if (name === 'width' && numValue > 0) {
                const newHeight = numValue / imageAspectRatio.current;
                setDimensions({ width: value, height: newHeight.toFixed(2) });
            } else if (name === 'height' && numValue > 0) {
                const newWidth = numValue * imageAspectRatio.current;
                setDimensions({ width: newWidth.toFixed(2), height: value });
            } else {
                 setDimensions(prev => ({...prev, [name]: value}));
            }
        } else {
            setDimensions(prev => ({...prev, [name]: value}));
        }
    };
    
    const resetState = () => {
        setFile(null);
        setPreviewUrl(null);
        setCalculatedPrice(null);
        setQuantity(1);
        setDimensions({ width: '', height: '' });
        imageAspectRatio.current = null;
        setImageHistory([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAddToCart = async () => {
        const width = parseFloat(dimensions.width);
        const height = parseFloat(dimensions.height);

        if (!file || !previewUrl || !(width > 0) || !(height > 0) || calculatedPrice === null) {
            toast({
                variant: 'destructive',
                title: 'Cannot Add to Cart',
                description: 'Please upload an image and specify valid dimensions.',
            });
            return;
        }

        setIsProcessing(true);
        try {
            // For a single design upload, the preview of the item *is* the gang sheet.
            // We create a canvas that represents the final print size.
            const dpi = 300;
            const canvas = document.createElement('canvas');
            canvas.width = width * dpi;
            canvas.height = height * dpi;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not create canvas context");
            
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = previewUrl;
            });

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const finalSheetPreviewUrl = canvas.toDataURL('image/png');

            const item: DynamicSheetCartItem = {
                id: `eflex-${Date.now()}`,
                type: 'dynamic_sheet',
                name: `Elevated Flex Transfer`,
                previewUrl: finalSheetPreviewUrl, // The "sheet" is just this one scaled image
                width: width,
                height: height,
                price: calculatedPrice / quantity, // Price per single item
                quantity: quantity,
            };

            onAddToCart(item);
            toast({
                title: 'Added to Cart',
                description: `${quantity} x ${width}" x ${height}" Elevated Flex transfers added.`,
            });
            
            resetState();

        } catch (err) {
            console.error("Error processing item", err);
            toast({
                variant: "destructive",
                title: "Error processing item",
                description: "There was an issue adding the item to your cart. Please try again."
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const getYouTubeEmbedUrl = (url: string | undefined): string | null => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            let videoId: string | null = null;
    
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else if (urlObj.hostname.includes('youtube.com')) {
                if (urlObj.pathname.startsWith('/shorts/')) {
                    videoId = urlObj.pathname.split('/shorts/')[1];
                } else if (urlObj.pathname === '/watch') {
                    videoId = urlObj.searchParams.get('v');
                }
            }
    
            if (videoId) {
                // Remove any extra query params from the videoId
                const cleanVideoId = videoId.split('&')[0];
                return `https://www.youtube.com/embed/${cleanVideoId}`;
            }
    
            return null; // Not a recognized YouTube URL
        } catch (error) {
            console.error("Invalid video URL", error);
            return null; // Invalid URL format
        }
    };

    const youtubeEmbedUrl = getYouTubeEmbedUrl(elevatedFlexVideo?.videoUrl);

    return (
        <div className="min-h-screen pb-12 bg-background text-foreground">
             {/* Hero Section */}
            <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center text-center px-4 sm:px-6 lg:px-8 overflow-hidden">
                <ParallaxContainer className="absolute inset-0" speed={0.3}>
                    {elevatedFlexHero && (
                        <Image
                            src={elevatedFlexHero.imageUrl}
                            alt={elevatedFlexHero.description}
                            fill
                            sizes="100vw"
                            className="object-cover"
                            data-ai-hint={elevatedFlexHero.imageHint}
                            priority
                        />
                    )}
                </ParallaxContainer>
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="relative z-10 max-w-4xl mx-auto text-white">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight">
                        {textContent.elevated_flex_title}
                    </h1>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 pt-20">
                 <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-white mb-4">{textContent.elevated_flex_benefits_title}</h2>
                    <div className="mt-20 space-y-24">
                        {benefits.map((benefit, index) => (
                            <div key={benefit.title} className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                                <div className={cn("perspective-container", index % 2 !== 0 && "md:order-2")}>
                                    {benefit.image && (
                                       <ParallaxImage 
                                            src={benefit.image.imageUrl}
                                            alt={benefit.title}
                                            data-ai-hint={benefit.image.imageHint}
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            className="aspect-video"
                                       />
                                    )}
                                </div>
                                <div className={cn("text-left", index % 2 !== 0 && "md:order-1")}>
                                     <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                                        {benefit.icon}
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-bold text-foreground">{benefit.title}</h3>
                                    <p className="mt-4 text-lg text-muted-foreground">{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>

            <div className="max-w-4xl mx-auto px-4">
                 <div className="text-center mb-8">
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {textContent.elevated_flex_subtitle}
                    </p>
                </div>
                <div className="glass-panel rounded-2xl p-8 border-dashed border-2 border-zinc-700 hover:border-zinc-500 transition-colors relative min-h-[400px] flex flex-col items-center justify-center">
                    {!file ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center"
                        >
                            <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-6 group hover:scale-110 transition-transform duration-300">
                                <Upload className="w-10 h-10 text-zinc-400 group-hover:text-accent transition-colors" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">Click to upload your vector-ready design</h3>
                            <p className="text-zinc-500 text-sm">PNG, JPG, or SVG. Bold, single color designs work best.</p>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                {/* Preview Area */}
                                <div className='space-y-4'>
                                    <div 
                                        className={cn(
                                            "flex-grow checkerboard rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center p-4 min-h-[300px]",
                                            isRemovingBg && 'cursor-eyedropper'
                                        )}
                                    >
                                        {previewUrl && (
                                            <img 
                                                src={previewUrl} 
                                                alt="Preview" 
                                                className="max-w-full max-h-[300px] object-contain shadow-2xl"
                                                onClick={handleBackgroundRemoval}
                                            />
                                        )}
                                    </div>
                                    <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 space-y-4">
                                        <Label className="flex items-center gap-2 text-zinc-300"><Droplet className="w-4 h-4"/> Image Tools</Label>
                                        <div className="space-y-3 pt-2">
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
                                </div>

                                {/* Pricing and Actions */}
                                <div className="space-y-6">
                                    <div className="bg-zinc-900/80 p-4 rounded-xl border border-white/10">
                                        <div className="flex items-center overflow-hidden">
                                            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center mr-3 flex-shrink-0 text-accent">
                                                <FileText />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-white font-medium truncate">{file.name}</p>
                                                {file.size > 0 && <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                                            </div>
                                            <Button 
                                                variant="ghost"
                                                size="icon"
                                                onClick={resetState}
                                                className="hover:bg-red-500/10 hover:text-red-500 text-zinc-500 ml-auto"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="flex items-center mb-1 text-zinc-400 text-xs"><Ruler className="w-3 h-3 mr-1"/> Dimensions (inches)</Label>
                                            <div className="flex gap-2">
                                                <Input name="width" value={dimensions.width} onChange={handleDimensionChange} placeholder="W" type="number" />
                                                <Input name="height" value={dimensions.height} onChange={handleDimensionChange} placeholder="H" type="number" />
                                            </div>
                                        </div>
                                        <div>
                                             <Label className="block mb-1 text-zinc-400 text-xs">Quantity</Label>
                                             <Input 
                                                type="number" 
                                                min="1" 
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                             />
                                        </div>
                                    </div>
                                    
                                    {(isLoadingPrice || pricePerSqInch === null) ? (
                                         <p className="text-center text-sm text-zinc-500">Loading pricing...</p>
                                    ) : (
                                        <div className="text-center bg-zinc-900/50 p-4 rounded-xl border border-white/10">
                                            <p className="text-zinc-400 text-sm">Total Price</p>
                                            <p className="text-4xl font-bold text-white">{calculatedPrice !== null ? formatCurrency(calculatedPrice) : '...'}</p>
                                        </div>
                                    )}

                                    <Button 
                                        onClick={handleAddToCart}
                                        disabled={isProcessing || calculatedPrice === null}
                                        className="w-full text-lg h-12"
                                    >
                                        {isProcessing ? (
                                            <span className="flex items-center">
                                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                                                Processing...
                                            </span>
                                        ) : (
                                            <>Add to Cart <ArrowRight className="ml-2 w-5 h-5" /></>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".png,.jpg,.jpeg,.svg" />
                </div>
            </div>

            {/* Video Section */}
            <div className="max-w-7xl mx-auto px-4 mt-24">
                 <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-4">{textContent.elevated_flex_video_title}</h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        {textContent.elevated_flex_video_desc}
                    </p>
                </div>
                {youtubeEmbedUrl ? (
                     <div className="aspect-video w-full bg-zinc-900 rounded-2xl border border-zinc-700 relative overflow-hidden shadow-2xl">
                        <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={youtubeEmbedUrl}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        ></iframe>
                    </div>
                ) : elevatedFlexVideo?.videoUrl ? (
                     <div className="aspect-video w-full bg-zinc-900 rounded-2xl border border-zinc-700 flex items-center justify-center text-center text-muted-foreground p-4">
                         <p>The provided video link is not a valid YouTube URL.</p>
                     </div>
                ) : null}
            </div>
        </div>
    );
};
