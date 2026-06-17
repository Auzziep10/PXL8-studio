'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, sanitizeFilename } from '@/lib/utils';
import { ServiceAddOn, SheetCartItem, ArtworkOnCanvas, DynamicSheetCartItem } from '@/lib/types';
import { 
    Upload, 
    Trash2, 
    ArrowRight, 
    ArrowLeft, 
    Ruler, 
    DollarSign, 
    Check, 
    Sparkles, 
    Cpu, 
    ShieldCheck, 
    Layers, 
    Droplet, 
    FileUp, 
    MonitorPlay,
    AlertTriangle,
    Percent
} from 'lucide-react';
import Link from 'next/link';

// Prebuilt upload tiers config
const uploadTiers = [
    { id: '22', label: 'Standard', maxWidth: 22, discount: 0 },
    { id: '51', label: 'Wide Format', maxWidth: 51, discount: 5 },
    { id: '63', label: 'Grand Format', maxWidth: 63, discount: 10 },
];
type UploadWidthTier = '22' | '51' | '63';

// Preset sizes for Custom DTF and Vinyl
const presetSizes = [
    { label: '2" x 2"', w: 2, h: 2 },
    { label: '3" x 3"', w: 3, h: 3 },
    { label: '4" x 4"', w: 4, h: 4 },
    { label: '5" x 5"', w: 5, h: 5 },
    { label: '6" x 6"', w: 6, h: 6 },
    { label: '8" x 8"', w: 8, h: 8 },
    { label: '10" x 10"', w: 10, h: 10 },
    { label: '12" x 12"', w: 12, h: 12 },
];

// Quantity options for progressive discount list
const quantityOptions = [10, 25, 50, 100, 250, 500, 1000];

// Helper to determine discount percentage based on quantity
function getDiscountPercent(qty: number): number {
    if (qty < 10) return 0;
    if (qty < 25) return 10;
    if (qty < 50) return 20;
    if (qty < 100) return 30;
    if (qty < 250) return 40;
    if (qty < 500) return 50;
    return 60;
}

// Helper function to draw tiled preview of gang sheet layout
function generateGangSheetPreview(
    imageUrl: string,
    width: number,
    height: number,
    quantity: number,
    rollWidth: number,
    gap: number,
    sheetHeight: number
): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const ppi = 30; // 30 pixels per inch for a compact preview
            const canvas = document.createElement('canvas');
            canvas.width = rollWidth * ppi;
            canvas.height = sheetHeight * ppi;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(imageUrl);
                return;
            }

            // Draw checkerboard background for transparent prints
            ctx.fillStyle = '#FAF9F6';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw grid pattern to resemble checkerboard
            const gridSize = 10;
            ctx.fillStyle = '#f0f0f0';
            for (let y = 0; y < canvas.height; y += gridSize * 2) {
                for (let x = 0; x < canvas.width; x += gridSize * 2) {
                    ctx.fillRect(x, y, gridSize, gridSize);
                    ctx.fillRect(x + gridSize, y + gridSize, gridSize, gridSize);
                }
            }

            // Draw grid line borders for the roll
            ctx.strokeStyle = '#e4e4e7';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);

            // Calculate grid layout
            const cols = Math.max(1, Math.floor((rollWidth + gap) / (width + gap)));
            
            // Draw each item
            for (let i = 0; i < quantity; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                
                const x = col * (width + gap) * ppi;
                const y = row * (height + gap) * ppi;
                const w = width * ppi;
                const h = height * ppi;
                
                ctx.drawImage(img, x, y, w, h);
            }

            // Convert to URL
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            resolve(imageUrl); // fallback
        };
        img.src = imageUrl;
    });
}

export default function ProductDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params?.id as string;
    
    const { addItem: onAddToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    // Configuration States (Custom transfers)
    const [selectedPreset, setSelectedPreset] = useState<string>('3" x 3"');
    const [customWidth, setCustomWidth] = useState<string>('3');
    const [customHeight, setCustomHeight] = useState<string>('3');
    const [isCustomSize, setIsCustomSize] = useState<boolean>(false);
    
    const [selectedQty, setSelectedQty] = useState<number>(50);
    const [isCustomQty, setIsCustomQty] = useState<boolean>(false);
    const [customQtyValue, setCustomQtyValue] = useState<string>('50');

    // Prebuilt Sheets State
    const [widthTier, setWidthTier] = useState<UploadWidthTier>('22');
    const [detectedDimensions, setDetectedDimensions] = useState<{w: number, h: number} | null>(null);

    // Common Upload/Instructions States
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [instructions, setInstructions] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageAspectRatio = useRef<number | null>(null);

    // Fetch price per sq inch from Firestore
    const sqInchPriceQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'serviceAddOns'), where('type', '==', 'per_sq_inch')) : null),
        [firestore]
    );
    const { data: sqInchPriceData } = useCollection<ServiceAddOn & { id: string }>(sqInchPriceQuery);
    
    const pricePerSqInch = useMemo(() => {
        if (sqInchPriceData && sqInchPriceData.length > 0) {
            return sqInchPriceData[0].price;
        }
        return 0.05; // Fallback to $0.05
    }, [sqInchPriceData]);

    // Dimensions calculations
    const finalWidth = useMemo(() => {
        if (isCustomSize) {
            return parseFloat(customWidth) || 0;
        }
        const preset = presetSizes.find(p => p.label === selectedPreset);
        return preset ? preset.w : 3;
    }, [isCustomSize, selectedPreset, customWidth]);

    const finalHeight = useMemo(() => {
        if (isCustomSize) {
            return parseFloat(customHeight) || 0;
        }
        const preset = presetSizes.find(p => p.label === selectedPreset);
        return preset ? preset.h : 3;
    }, [isCustomSize, selectedPreset, customHeight]);

    const finalQuantity = useMemo(() => {
        if (isCustomQty) {
            return Math.max(1, parseInt(customQtyValue) || 1);
        }
        return selectedQty;
    }, [isCustomQty, selectedQty, customQtyValue]);

    // Base pricing and progressive discounts calculation
    const calculatedPrice = useMemo(() => {
        if (finalWidth > 0 && finalHeight > 0 && pricePerSqInch > 0) {
            const area = finalWidth * finalHeight;
            const basePrice = area * pricePerSqInch * finalQuantity;
            const discount = getDiscountPercent(finalQuantity);
            return basePrice * (1 - discount / 100);
        }
        return 0;
    }, [finalWidth, finalHeight, finalQuantity, pricePerSqInch]);

    // Handle File upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            
            if (!uploadedFile.type.startsWith('image/')) {
                 toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload an image file (PNG, JPG, etc.).' });
                 return;
            }

            setFile(uploadedFile);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setPreviewUrl(result);

                const img = new Image();
                img.onload = () => {
                    imageAspectRatio.current = img.naturalWidth / img.naturalHeight;
                    
                    // Also populate dimensions for prebuilt sheets
                    const dpi = 300;
                    setDetectedDimensions({
                        w: img.naturalWidth / dpi,
                        h: img.naturalHeight / dpi
                    });
                    
                    // If custom size is selected, update custom height automatically to match aspect ratio
                    if (isCustomSize && imageAspectRatio.current) {
                        const w = parseFloat(customWidth) || 0;
                        if (w > 0) {
                            setCustomHeight((w / imageAspectRatio.current).toFixed(2));
                        }
                    }
                };
                img.src = result;
            };
            reader.readAsDataURL(uploadedFile);
        }
    };

    const handleCustomWidthChange = (val: string) => {
        setCustomWidth(val);
        const w = parseFloat(val) || 0;
        if (w > 0 && imageAspectRatio.current) {
            setCustomHeight((w / imageAspectRatio.current).toFixed(2));
        }
    };

    const handleCustomHeightChange = (val: string) => {
        setCustomHeight(val);
        const h = parseFloat(val) || 0;
        if (h > 0 && imageAspectRatio.current) {
            setCustomWidth((h * imageAspectRatio.current).toFixed(2));
        }
    };

    const resetState = () => {
        setFile(null);
        setPreviewUrl(null);
        setInstructions('');
        setDetectedDimensions(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Auto Layout Sheet Maker (same logic as CustomerPathWizard)
    const handleAddCustomToCart = async () => {
        if (!file || !previewUrl || !(finalWidth > 0) || !(finalHeight > 0) || calculatedPrice === 0) {
            toast({
                variant: 'destructive',
                title: 'Cannot Proceed',
                description: 'Please upload a design file and set dimensions.',
            });
            return;
        }

        setIsGenerating(true);
        setGenerationProgress(15);

        try {
            const rollWidth = 22; // standard roll width
            const gap = 0.3; // gap in inches
            const dpi = 300;

            // Calculate columns and rows required to fit quantity
            const cols = Math.max(1, Math.floor((rollWidth + gap) / (finalWidth + gap)));
            const rows = Math.ceil(finalQuantity / cols);
            const sheetHeight = rows * finalHeight + (rows - 1) * gap;

            setGenerationProgress(60);

            // Generate placement coordinate array
            const artworksList: ArtworkOnCanvas[] = [];
            for (let i = 0; i < finalQuantity; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const xInches = col * (finalWidth + gap);
                const yInches = row * (finalHeight + gap);

                artworksList.push({
                    id: `art-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    imageUrl: "", // strip base64 for cart storage optimization
                    width: finalWidth,
                    height: finalHeight,
                    dpi: dpi,
                    x: xInches,
                    y: yInches,
                    rotation: 0,
                    canvasWidth: finalWidth * dpi,
                    canvasHeight: finalHeight * dpi,
                    quantity: 1
                });
            }
            setGenerationProgress(80);

            const finalSheetPreviewUrl = await generateGangSheetPreview(
                previewUrl,
                finalWidth,
                finalHeight,
                finalQuantity,
                rollWidth,
                gap,
                sheetHeight
            );

            setGenerationProgress(95);

            const cartItem: SheetCartItem = {
                id: `GNG-AUTO-${Date.now()}`,
                type: 'sheet',
                sheetSize: {
                    name: `Custom Single Transfers (22" x ${sheetHeight.toFixed(0)}")`,
                    width: rollWidth,
                    height: parseFloat(sheetHeight.toFixed(1)),
                    price: calculatedPrice,
                    discount: 0,
                    usage: 'Upload'
                },
                previewUrl: finalSheetPreviewUrl,
                artworks: artworksList,
                quantity: 1,
            };

            // Inject special instructions notes as a service addon or log it
            if (instructions.trim()) {
                // If there are instructions, we can append it to sheetSize name or store it
                cartItem.sheetSize.name += ` - Instructions: "${instructions}"`;
            }

            onAddToCart(cartItem);
            setGenerationProgress(100);

            toast({
                title: 'Transfers Added to Cart!',
                description: `Successfully packed ${finalQuantity} copies onto a 22" x ${sheetHeight.toFixed(0)}" roll.`,
            });

            resetState();
            router.push('/cart');

        } catch (err) {
            console.error("Error creating layout roll:", err);
            toast({
                variant: 'destructive',
                title: 'Auto-Layout Failed',
                description: 'Failed to construct print layout roll.',
            });
        } finally {
            setIsGenerating(false);
            setGenerationProgress(0);
        }
    };

    // Prebuilt Sheets pricing & add-to-cart
    const selectedTier = useMemo(() => uploadTiers.find(t => t.id === widthTier)!, [widthTier]);
    const maxPrebuiltWidth = selectedTier.maxWidth;
    const isPrebuiltWidthValid = useMemo(() => {
        if (!detectedDimensions) return true;
        return detectedDimensions.w <= maxPrebuiltWidth + 0.01;
    }, [detectedDimensions, maxPrebuiltWidth]);

    const calculatedPrebuiltPrice = useMemo(() => {
        if (detectedDimensions && pricePerSqInch > 0) {
            const area = detectedDimensions.w * detectedDimensions.h;
            let price = area * pricePerSqInch;
            if (selectedTier.discount > 0) {
                price = price - (price * (selectedTier.discount / 100));
            }
            return price * finalQuantity;
        }
        return 0;
    }, [detectedDimensions, pricePerSqInch, selectedTier, finalQuantity]);

    const handleAddPrebuiltToCart = () => {
        if (!file || !previewUrl || !detectedDimensions || calculatedPrebuiltPrice === 0 || !isPrebuiltWidthValid) {
            toast({
                variant: 'destructive',
                title: 'Cannot Add to Cart',
                description: !isPrebuiltWidthValid ? 'Width exceeds maximum tier width.' : 'Please upload a completed sheet file.',
            });
            return;
        }

        const item: DynamicSheetCartItem = {
            id: `dyn-${Date.now()}`,
            type: 'dynamic_sheet',
            name: `Prebuilt Gang Sheet (${selectedTier.label} - ${maxPrebuiltWidth}")`,
            previewUrl: previewUrl,
            width: detectedDimensions.w,
            height: detectedDimensions.h,
            price: calculatedPrebuiltPrice / finalQuantity, // price per unit
            quantity: finalQuantity,
        };

        if (instructions.trim()) {
            item.name += ` - Notes: "${instructions}"`;
        }

        onAddToCart(item);
        toast({
            title: 'Gang Sheet Added',
            description: `${finalQuantity} x ${detectedDimensions.w.toFixed(1)}" x ${detectedDimensions.h.toFixed(1)}" roll added to cart.`,
        });
        resetState();
        router.push('/cart');
    };

    // Direct configuration views rendering
    if (productId === 'gang-sheet-builder') {
        return (
            <div className="min-h-screen bg-[#FAF9F6] py-16 px-4">
                <div className="max-w-4xl mx-auto bg-white border border-zinc-200/60 rounded-[2.5rem] p-8 md:p-12 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-150">
                            <img src="/gang_sheet_builder_desktop.png" alt="Pro Canvas Builder" className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-3">
                            <span className="text-[10px] font-mono tracking-widest text-cyan-600 font-bold uppercase">Pro Canvas Builder</span>
                            <h2 className="text-3xl font-serif text-zinc-900 font-normal">Build Custom Sheets</h2>
                            <p className="text-xs text-zinc-500 font-light leading-relaxed">
                                Our canvas workspace is engineered for design flexibility. Upload multiple assets, align designs dynamically, duplicate prints, and verify resolution markers live on canvas.
                            </p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col justify-between border-l border-zinc-100 pl-0 md:pl-10 space-y-8">
                        <div className="space-y-6">
                            <h3 className="text-lg font-serif text-zinc-900">How to build your sheet:</h3>
                            <ul className="space-y-4 text-xs text-zinc-500 font-light">
                                <li className="flex gap-3">
                                    <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center font-mono font-bold text-[10px] text-zinc-700 flex-shrink-0">1</span>
                                    <span>Open the canvas builder workspace and select your canvas roll size.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center font-mono font-bold text-[10px] text-zinc-700 flex-shrink-0">2</span>
                                    <span>Upload single images (transparent PNG files are highly recommended).</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center font-mono font-bold text-[10px] text-zinc-700 flex-shrink-0">3</span>
                                    <span>Drag, scale, duplicate, and rotate designs to fill your space.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center font-mono font-bold text-[10px] text-zinc-700 flex-shrink-0">4</span>
                                    <span>Our system monitors layout DPI automatically to guarantee sharpness.</span>
                                </li>
                            </ul>
                        </div>

                        <Button asChild size="lg" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-full uppercase tracking-widest text-xs h-12">
                            <Link href="/build?type=dtf">
                                Open Canvas Builder <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const isPrebuilt = productId === 'gang-sheets';
    const isDTF = productId === 'single-transfers';
    const isVinyl = productId === 'vinyl-transfers';

    const productName = isDTF ? 'Single Transfers' : isVinyl ? 'Vinyl Transfers' : 'Gang Sheets';
    const productDesc = isDTF 
        ? 'Automated roll packing for single designs. Simply specify size and quantity.' 
        : isVinyl 
            ? 'Thick vector vinyl cuts with elevated texture. Perfect for solid logo shapes.' 
            : 'Submit finished print rolls exported from design editors.';
    
    const imageSrc = isDTF ? '/single_transfers_dtf.png' : isVinyl ? '/vinyl_transfers_flex.png' : '/prebuilt_gang_sheets.png';

    return (
        <div className="min-h-screen bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8">
            {/* Back Button */}
            <div className="max-w-6xl mx-auto mb-6">
                <Link href="/" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 font-medium font-mono uppercase tracking-wider">
                    <ArrowLeft className="w-4 h-4" /> Back to Products
                </Link>
            </div>

            <div className="max-w-6xl mx-auto bg-white border border-zinc-200/60 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    
                    {/* Left Column: Image Mockup & Description */}
                    <div className="p-8 md:p-12 bg-zinc-50/50 flex flex-col justify-between border-r border-zinc-150/50">
                        <div className="space-y-8">
                            <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white border border-zinc-150/40 shadow-sm relative flex items-center justify-center p-4">
                                {previewUrl ? (
                                    <div className="w-full h-full relative flex items-center justify-center checkerboard rounded-xl overflow-hidden">
                                        <img src={previewUrl} alt="Uploaded preview" className="max-w-full max-h-[300px] object-contain shadow-md" />
                                    </div>
                                ) : (
                                    <img src={imageSrc} alt={productName} className="w-full h-full object-cover" />
                                )}
                            </div>

                            <div className="space-y-4">
                                <span className="text-[9px] font-mono tracking-widest text-emerald-600 font-bold uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    {isDTF ? 'DTF Technology' : isVinyl ? 'Elevated Flex' : 'Print-Ready Roll'}
                                </span>
                                <h2 className="text-3xl font-serif text-zinc-900 font-normal">{productName}</h2>
                                <p className="text-xs text-zinc-500 font-light leading-relaxed">{productDesc}</p>
                            </div>
                        </div>

                        {/* Feature Points Card */}
                        <div className="mt-8 bg-white border border-zinc-150/40 p-5 rounded-2xl space-y-3 shadow-2xs">
                            <h4 className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Product Details:</h4>
                            <ul className="text-xs text-zinc-650 space-y-2 font-light">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <span>Stretchable, crack-resistant polymer print substrate</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <span>High durability: rated for 50+ home laundry cycles</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <span>Compatible with cotton, polyester, nylon, and blends</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column: Sticker Mule Styled Configurator */}
                    <div className="p-8 md:p-12 space-y-8">
                        
                        {/* Step 1: Size Configuration */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-mono tracking-wider text-zinc-400 uppercase flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-[9px]">1</span>
                                Choose Size
                            </h3>

                            {!isPrebuilt ? (
                                <div className="space-y-4">
                                    {/* Preset sizes grid */}
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {presetSizes.map((size) => (
                                            <button
                                                key={size.label}
                                                onClick={() => {
                                                    setSelectedPreset(size.label);
                                                    setIsCustomSize(false);
                                                }}
                                                className={`py-2 px-3 border rounded-xl text-center text-xs font-medium transition-all ${
                                                    !isCustomSize && selectedPreset === size.label
                                                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                                                        : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                                                }`}
                                            >
                                                {size.label}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setIsCustomSize(true)}
                                            className={`py-2 px-3 border rounded-xl text-center text-xs font-medium transition-all ${
                                                isCustomSize
                                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                                                    : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                                            }`}
                                        >
                                            Custom Size
                                        </button>
                                    </div>

                                    {/* Custom Size Inputs */}
                                    {isCustomSize && (
                                        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 border border-zinc-200/60 rounded-2xl animate-in fade-in duration-200">
                                            <div>
                                                <Label className="text-[10px] text-zinc-500 font-mono uppercase mb-1.5 block">Width (in)</Label>
                                                <Input 
                                                    type="number"
                                                    value={customWidth}
                                                    onChange={(e) => handleCustomWidthChange(e.target.value)}
                                                    className="bg-white border-zinc-250 focus:border-zinc-400 rounded-lg h-9 text-xs"
                                                    placeholder="Inches"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] text-zinc-500 font-mono uppercase mb-1.5 block">Height (in)</Label>
                                                <Input 
                                                    type="number"
                                                    value={customHeight}
                                                    onChange={(e) => handleCustomHeightChange(e.target.value)}
                                                    className="bg-white border-zinc-250 focus:border-zinc-400 rounded-lg h-9 text-xs"
                                                    placeholder="Inches"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Prebuilt width tiers */
                                <div className="grid grid-cols-3 gap-3">
                                    {uploadTiers.map((tier) => (
                                        <button
                                            key={tier.id}
                                            onClick={() => {
                                                setWidthTier(tier.id as UploadWidthTier);
                                                resetState();
                                            }}
                                            className={`p-3 border rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                                widthTier === tier.id
                                                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                                                    : 'border-zinc-200 text-zinc-700 hover:border-zinc-400 bg-white'
                                            }`}
                                        >
                                            <span className="text-xs font-bold">{tier.label}</span>
                                            <span className={`text-[9px] font-mono ${widthTier === tier.id ? 'text-zinc-300' : 'text-zinc-400'}`}>{tier.maxWidth}" wide</span>
                                            {tier.discount > 0 && (
                                                <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[8px] font-bold ${widthTier === tier.id ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    -{tier.discount}%
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Choose Quantity & Pricing Grid */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-mono tracking-wider text-zinc-400 uppercase flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-[9px]">2</span>
                                Choose Quantity
                            </h3>

                            {!isPrebuilt ? (
                                <div className="space-y-4">
                                    {/* Pricing progressive discount list */}
                                    <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-2xs divide-y divide-zinc-150">
                                        {quantityOptions.map((qty) => {
                                            const discount = getDiscountPercent(qty);
                                            const area = finalWidth * finalHeight;
                                            const basePrice = area * pricePerSqInch * qty;
                                            const finalRowPrice = basePrice * (1 - discount / 100);
                                            const unitPrice = finalRowPrice / qty;

                                            return (
                                                <div
                                                    key={qty}
                                                    onClick={() => {
                                                        setSelectedQty(qty);
                                                        setIsCustomQty(false);
                                                    }}
                                                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                                                        !isCustomQty && selectedQty === qty
                                                            ? 'bg-zinc-50 font-medium text-zinc-900'
                                                            : 'text-zinc-650 hover:bg-zinc-50/50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="radio" 
                                                            name="qty-row" 
                                                            checked={!isCustomQty && selectedQty === qty}
                                                            onChange={() => {}} // handled by div onClick
                                                            className="h-3.5 w-3.5 border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                                        />
                                                        <span>{qty} copies</span>
                                                        {discount > 0 && (
                                                            <span className="bg-emerald-50 border border-emerald-500/10 text-emerald-600 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold">
                                                                -{discount}% Off
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-semibold">{formatCurrency(finalRowPrice)}</span>
                                                        <span className="text-[10px] text-zinc-400 block font-light">({formatCurrency(unitPrice)} ea)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {/* Custom Qty option */}
                                        <div
                                            onClick={() => setIsCustomQty(true)}
                                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                                                isCustomQty ? 'bg-zinc-50 font-medium text-zinc-900' : 'text-zinc-650 hover:bg-zinc-50/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="radio" 
                                                    name="qty-row" 
                                                    checked={isCustomQty}
                                                    onChange={() => {}}
                                                    className="h-3.5 w-3.5 border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                                />
                                                <span>Custom Quantity</span>
                                            </div>
                                            {isCustomQty && (
                                                <div className="w-24">
                                                    <Input 
                                                        type="number"
                                                        value={customQtyValue}
                                                        onChange={(e) => setCustomQtyValue(e.target.value)}
                                                        className="bg-white border-zinc-250 focus:border-zinc-400 rounded-lg h-7 text-xs px-2 text-right"
                                                        placeholder="Qty"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Prebuilt Sheet Quantity Selector */
                                <div>
                                    <Label className="text-[10px] text-zinc-500 font-mono uppercase mb-1.5 block">Quantity of Rolls</Label>
                                    <Input 
                                        type="number"
                                        min="1"
                                        value={customQtyValue}
                                        onChange={(e) => setCustomQtyValue(e.target.value)}
                                        className="bg-white border-zinc-200 focus:border-zinc-400 rounded-lg h-9 text-xs"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Step 3: File Upload */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-mono tracking-wider text-zinc-400 uppercase flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-[9px]">3</span>
                                Upload Artwork
                            </h3>

                            {isGenerating ? (
                                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 text-center">
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                        <div className="absolute inset-0 border-4 border-zinc-200 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
                                        <Cpu className="w-6 h-6 text-zinc-700 animate-pulse" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-zinc-900">Packing Print Roll...</h4>
                                        <p className="text-[10px] text-zinc-550">Laying out {finalQuantity} copies onto canvas</p>
                                    </div>
                                    <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden max-w-xs mx-auto">
                                        <div className="bg-zinc-900 h-full transition-all duration-300" style={{ width: `${generationProgress}%` }}></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Upload trigger zone */}
                                    <div className="bg-white border-dashed border-2 border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center min-h-[140px]">
                                        {!file ? (
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center py-2"
                                            >
                                                <Upload className="w-8 h-8 text-zinc-400 mb-2 hover:scale-115 transition-transform duration-300" />
                                                <h4 className="text-xs font-bold text-zinc-900 mb-1">Select your design file</h4>
                                                <p className="text-zinc-450 text-[10px] max-w-xs mx-auto mb-2 leading-relaxed">
                                                    PNG, JPG, SVG, PDF, or PSD. Transparent background PNG is highly recommended.
                                                </p>
                                                <Button variant="outline" size="sm" className="rounded-full border-zinc-300 text-[10px] h-8" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                                    Browse Files
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col justify-between">
                                                <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl mb-4 text-[11px]">
                                                    <div className="truncate flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 flex-shrink-0">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                        <span className="text-zinc-700 truncate max-w-[180px] font-medium">{file.name}</span>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={resetState}
                                                        className="w-7 h-7 text-zinc-400 hover:text-red-500 hover:bg-transparent"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                
                                                {/* Prebuilt image validation check */}
                                                {isPrebuilt && detectedDimensions && (
                                                    <div className={`p-3 rounded-lg border text-[11px] flex items-start gap-2 mb-2 ${
                                                        isPrebuiltWidthValid 
                                                            ? 'bg-emerald-50 border-emerald-500/20 text-emerald-700' 
                                                            : 'bg-red-50 border-red-500/20 text-red-700'
                                                    }`}>
                                                        {isPrebuiltWidthValid ? (
                                                            <>
                                                                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                                <span>Image size matches within {maxPrebuiltWidth}" wide tier ({detectedDimensions.w.toFixed(1)}" x {detectedDimensions.h.toFixed(1)}")</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                                <span>Image width ({detectedDimensions.w.toFixed(1)}") exceeds the {maxPrebuiltWidth}" wide tier limit. Please resize or choose a wider tier.</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".png,.jpg,.jpeg,.svg,.pdf,.psd,.ai" />
                                    </div>

                                    {/* Step 4: Special Instructions */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-zinc-500 font-mono uppercase">Special Instructions (Optional)</Label>
                                        <Textarea 
                                            value={instructions}
                                            onChange={(e) => setInstructions(e.target.value)}
                                            placeholder="Example: Make background transparent, enhance colors, etc."
                                            className="bg-white border-zinc-200 focus:border-zinc-400 rounded-xl text-xs h-16 min-h-[50px] resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Order Summary & CTA */}
                        {file && (
                            <div className="bg-zinc-50 border border-zinc-200/60 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200">
                                <div className="space-y-2 text-xs text-zinc-500">
                                    <div className="flex justify-between">
                                        <span>Product:</span>
                                        <span className="font-semibold text-zinc-700">{productName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Selected Sizing:</span>
                                        <span className="font-semibold text-zinc-700 font-mono">
                                            {isPrebuilt 
                                                ? `${detectedDimensions?.w.toFixed(1)}" x ${detectedDimensions?.h.toFixed(1)}"` 
                                                : `${finalWidth}" x ${finalHeight}"`
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total copies:</span>
                                        <span className="font-semibold text-zinc-700">{finalQuantity}</span>
                                    </div>
                                    <div className="border-t border-zinc-200 pt-2 flex justify-between items-center text-sm font-bold text-zinc-900">
                                        <span>Estimated Total:</span>
                                        <span className="text-zinc-900">
                                            {formatCurrency(isPrebuilt ? calculatedPrebuiltPrice : calculatedPrice)}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    onClick={isPrebuilt ? handleAddPrebuiltToCart : handleAddCustomToCart}
                                    disabled={
                                        isGenerating || 
                                        !file || 
                                        (isPrebuilt && !isPrebuiltWidthValid) || 
                                        (isPrebuilt ? calculatedPrebuiltPrice === 0 : calculatedPrice === 0)
                                    }
                                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-full uppercase tracking-widest text-[10px] font-bold h-12 flex items-center justify-center gap-2"
                                >
                                    Add to Cart & Checkout <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                        
                    </div>

                </div>
            </div>
        </div>
    );
}
