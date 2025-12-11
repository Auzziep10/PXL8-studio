
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DynamicSheetCartItem, ServiceAddOn } from '@/lib/types';
import { Upload, FileText, CheckCircle, ArrowRight, Trash2, ShieldCheck, Ruler, DollarSign, Percent, AlertTriangle } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

type UploadWidthTier = 'standard' | 'wide';

export default function PrebuiltUploadPage() {
    const { addItem: onAddToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const addOnsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'serviceAddOns')) : null),
        [firestore]
    );
    const { data: addOns, isLoading: isLoadingPrice } = useCollection<ServiceAddOn & {id: string}>(addOnsQuery);
    
    const { pricePerSqInch, wideFormatDiscount } = useMemo(() => {
        if (addOns && addOns.length > 0) {
            const sqInch = addOns.find(a => a.type === 'per_sq_inch')?.price || null;
            const discount = addOns.find(a => a.type === 'wide_format_discount')?.price || 0;
            return { pricePerSqInch: sqInch, wideFormatDiscount: discount };
        }
        return { pricePerSqInch: null, wideFormatDiscount: 0 };
    }, [addOns]);

    const [widthTier, setWidthTier] = useState<UploadWidthTier>('standard');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [detectedDimensions, setDetectedDimensions] = useState<{w: number, h: number} | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const maxWidth = widthTier === 'standard' ? 22 : 43;

    useEffect(() => {
        if (detectedDimensions && pricePerSqInch !== null) {
            // Validate width
            if (detectedDimensions.w > maxWidth) {
                setValidationError(`Image width (${detectedDimensions.w.toFixed(1)}") exceeds the maximum allowed width of ${maxWidth}" for this tier.`);
                setCalculatedPrice(null);
                return;
            }
            setValidationError(null);

            const area = detectedDimensions.w * detectedDimensions.h;
            let price = area * pricePerSqInch;
            
            if (widthTier === 'wide' && wideFormatDiscount > 0) {
                price = price - (price * (wideFormatDiscount / 100));
            }
            setCalculatedPrice(price);
        } else {
            setCalculatedPrice(null);
        }
    }, [detectedDimensions, pricePerSqInch, widthTier, maxWidth, wideFormatDiscount]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            setDetectedDimensions(null);
            setCalculatedPrice(null);
            setValidationError(null);
            
            if (uploadedFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    setPreviewUrl(result);

                    const img = new Image();
                    img.onload = () => {
                        const dpi = 300; // Assume 300 DPI
                        const widthInch = img.naturalWidth / dpi;
                        const heightInch = img.naturalHeight / dpi;
                        
                        setDetectedDimensions({ w: widthInch, h: heightInch });
                    };
                    img.src = result;
                };
                reader.readAsDataURL(uploadedFile);
            } else {
                setPreviewUrl(null);
                setValidationError("Unsupported file type. Please upload an image.");
            }
        }
    };
    
    const resetState = () => {
        setFile(null);
        setPreviewUrl(null);
        setDetectedDimensions(null);
        setCalculatedPrice(null);
        setQuantity(1);
        setValidationError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleTierChange = (tier: UploadWidthTier) => {
        setWidthTier(tier);
        resetState();
    };

    const handleAddToCart = async () => {
        if (!file || !previewUrl || !detectedDimensions || calculatedPrice === null || validationError) {
            toast({
                variant: 'destructive',
                title: 'Cannot Add to Cart',
                description: validationError || 'Please upload a valid image to calculate the price.',
            });
            return;
        }

        setIsProcessing(true);
        try {
            const item: DynamicSheetCartItem = {
                id: `dyn-${Date.now()}`,
                type: 'dynamic_sheet',
                name: `Custom Upload (${widthTier})`,
                previewUrl: previewUrl,
                width: detectedDimensions.w,
                height: detectedDimensions.h,
                price: calculatedPrice,
                quantity: quantity,
            };

            onAddToCart(item);
            toast({
                title: 'Added to Cart',
                description: `${quantity} x ${detectedDimensions.w.toFixed(1)}" x ${detectedDimensions.h.toFixed(1)}" custom sheet added.`,
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
    
    return (
        <div className="min-h-screen pb-12">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">Upload Ready-to-Print Sheet</h1>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        Have your gang sheet pre-built? Upload it here. We'll automatically detect the size and calculate the price for you based on the width tier you select.
                    </p>
                </div>

                <div className="mb-8">
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                        <div 
                            onClick={() => handleTierChange('standard')}
                            className={cn('glass-panel p-6 rounded-2xl border-2 text-center cursor-pointer transition-all', widthTier === 'standard' ? 'border-primary' : 'border-zinc-700 hover:border-zinc-500')}
                        >
                            <h3 className="font-bold text-white">Standard</h3>
                            <p className="text-zinc-400 text-sm">Up to 22" Wide</p>
                        </div>
                         <div 
                            onClick={() => handleTierChange('wide')}
                            className={cn('glass-panel p-6 rounded-2xl border-2 text-center cursor-pointer transition-all', widthTier === 'wide' ? 'border-primary' : 'border-zinc-700 hover:border-zinc-500')}
                        >
                            <h3 className="font-bold text-white">Wide Format</h3>
                            <p className="text-zinc-400 text-sm">Up to 43" Wide</p>
                            {wideFormatDiscount > 0 && <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent"><Percent className="h-3 w-3" />{wideFormatDiscount}% Off</span>}
                        </div>
                    </div>
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
                            <h3 className="text-xl font-medium text-white mb-2">Click to upload or drag and drop</h3>
                            <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-6">
                                Max width ${maxWidth}". Length is unlimited. PNG recommended with transparent background.
                            </p>
                            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                Select File
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6 bg-zinc-900/80 p-4 rounded-xl border border-white/10">
                                <div className="flex items-center overflow-hidden">
                                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center mr-3 flex-shrink-0 text-accent">
                                        <FileText />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-white font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost"
                                    size="icon"
                                    onClick={resetState}
                                    className="hover:bg-red-500/10 hover:text-red-500 text-zinc-500"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                {/* Preview Area */}
                                <div className="flex-grow bg-checkerboard-dark rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center p-4 min-h-[300px]">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-[300px] object-contain shadow-2xl" />
                                    ) : (
                                        <div className="text-zinc-500 flex flex-col items-center">
                                            <FileText className="w-16 h-16 mb-2 opacity-50" />
                                            <p>Preview not available for this file type</p>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center">
                                        <ShieldCheck className="w-4 h-4 text-accent mr-2" />
                                        <span className="text-xs text-white font-medium">Ready for Checkout</span>
                                    </div>
                                </div>

                                {/* Pricing and Actions */}
                                <div className="space-y-6">
                                    {isLoadingPrice && <p>Loading pricing...</p>}
                                    {pricePerSqInch === null && !isLoadingPrice && <p className="text-red-500">Dynamic pricing is not configured.</p>}
                                    
                                    {detectedDimensions && (
                                        <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/10">
                                            <div className="flex justify-between items-center text-sm mb-2 text-zinc-400">
                                                <span className="flex items-center"><Ruler className="w-4 h-4 mr-2"/> Detected Size</span>
                                                <span className="font-mono text-white">{detectedDimensions.w.toFixed(1)}" x {detectedDimensions.h.toFixed(1)}"</span>
                                            </div>
                                             <div className="flex justify-between items-center text-sm text-zinc-400">
                                                <span className="flex items-center"><DollarSign className="w-4 h-4 mr-2"/> Price / sq. in.</span>
                                                <span className="font-mono text-white">{pricePerSqInch ? formatCurrency(pricePerSqInch) : 'N/A'}</span>
                                            </div>
                                            {widthTier === 'wide' && wideFormatDiscount > 0 && (
                                                 <div className="flex justify-between items-center text-sm text-accent mt-2 pt-2 border-t border-white/5">
                                                    <span className="flex items-center"><Percent className="w-4 h-4 mr-2"/> Wide Discount</span>
                                                    <span className="font-mono text-white">{wideFormatDiscount}%</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {validationError && (
                                        <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            {validationError}
                                        </div>
                                    )}

                                    {calculatedPrice !== null && !validationError && (
                                        <div className="text-center">
                                            <p className="text-zinc-400 text-sm">Calculated Price</p>
                                            <p className="text-4xl font-bold text-white">{formatCurrency(calculatedPrice)}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-4">
                                         <div className="col-span-1">
                                             <Label className="block text-xs text-zinc-400 mb-1 ml-1">Quantity</Label>
                                             <Input 
                                                type="number" 
                                                min="1" 
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-primary focus:border-primary transition-all"
                                             />
                                         </div>
                                         <Button 
                                            onClick={handleAddToCart}
                                            disabled={isProcessing || calculatedPrice === null || !!validationError}
                                            className="col-span-2 text-lg h-auto"
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
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".png,.jpg,.jpeg,.pdf,.ai,.psd" />
                </div>
            </div>
        </div>
    );
};
