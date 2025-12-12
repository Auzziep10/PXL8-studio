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

const uploadTiers = [
    { id: '22', label: 'Standard', maxWidth: 22, discount: 0 },
    { id: '51', label: 'Wide Format', maxWidth: 51, discount: 5 },
    { id: '63', label: 'Grand Format', maxWidth: 63, discount: 10 },
];

type UploadWidthTier = '22' | '51' | '63';

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
            // This discount logic might need adjustment if different tiers have different discounts.
            // For now, we'll use the first one found.
            const discount = addOns.find(a => a.type === 'wide_format_discount')?.price || 0;
            return { pricePerSqInch: sqInch, wideFormatDiscount: discount };
        }
        return { pricePerSqInch: null, wideFormatDiscount: 0 };
    }, [addOns]);

    const [widthTier, setWidthTier] = useState<UploadWidthTier>('22');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [detectedDimensions, setDetectedDimensions] = useState<{w: number, h: number} | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedTier = useMemo(() => uploadTiers.find(t => t.id === widthTier)!, [widthTier]);
    const maxWidth = selectedTier.maxWidth;

    useEffect(() => {
        if (detectedDimensions && pricePerSqInch !== null) {
            // Validate width, allowing for a small floating point tolerance
            if (detectedDimensions.w > maxWidth + 0.01) {
                setValidationError(`Image width (${detectedDimensions.w.toFixed(1)}") exceeds the maximum allowed width of ${maxWidth}" for this tier.`);
                setCalculatedPrice(null);
                return;
            }
            setValidationError(null);

            const area = detectedDimensions.w * detectedDimensions.h;
            let price = area * pricePerSqInch;
            
            // Apply discount based on the selected tier's config
            if (selectedTier.discount > 0) {
                price = price - (price * (selectedTier.discount / 100));
            }
            setCalculatedPrice(price);
        } else {
            setCalculatedPrice(null);
        }
    }, [detectedDimensions, pricePerSqInch, widthTier, maxWidth, selectedTier]);


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
                name: `Custom Upload (${selectedTier.label})`,
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
                    <h1 className="text-4xl font-bold text-foreground mb-4">Upload Ready-to-Print Sheet</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Have your gang sheet pre-built? Upload it here. We'll automatically detect the size and calculate the price for you based on the width tier you select.
                    </p>
                </div>

                <div className="mb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        {uploadTiers.map(tier => (
                            <div 
                                key={tier.id}
                                onClick={() => handleTierChange(tier.id as UploadWidthTier)}
                                className={cn(
                                    'glass-panel p-6 rounded-2xl border-2 text-center cursor-pointer transition-all', 
                                    widthTier === tier.id ? 'border-primary' : 'border-border hover:border-muted-foreground'
                                )}
                            >
                                <h3 className="font-bold text-foreground">{tier.label}</h3>
                                <p className="text-muted-foreground text-sm">Up to {tier.maxWidth}" Wide</p>
                                {tier.discount > 0 && <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent"><Percent className="h-3 w-3" />{tier.discount}% Off</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-panel rounded-2xl p-8 border-dashed border-2 border-border hover:border-muted-foreground transition-colors relative min-h-[400px] flex flex-col items-center justify-center">
                    {!file ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center"
                        >
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6 group hover:scale-110 transition-transform duration-300">
                                <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <h3 className="text-xl font-medium text-foreground mb-2">Click to upload or drag and drop</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                                Max width {maxWidth}". Length is unlimited. PNG recommended with transparent background.
                            </p>
                            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                Select File
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6 bg-secondary p-4 rounded-xl border border-border">
                                <div className="flex items-center overflow-hidden">
                                    <div className="w-10 h-10 rounded bg-background flex items-center justify-center mr-3 flex-shrink-0 text-primary">
                                        <FileText />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-foreground font-medium truncate">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost"
                                    size="icon"
                                    onClick={resetState}
                                    className="hover:bg-red-500/10 hover:text-red-500 text-muted-foreground"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                {/* Preview Area */}
                                <div className="flex-grow bg-checkerboard-dark rounded-xl border border-border relative overflow-hidden flex items-center justify-center p-4 min-h-[300px]">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-[300px] object-contain shadow-2xl" />
                                    ) : (
                                        <div className="text-muted-foreground flex flex-col items-center">
                                            <FileText className="w-16 h-16 mb-2 opacity-50" />
                                            <p>Preview not available for this file type</p>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-background/60 backdrop-blur-md px-3 py-1 rounded-full border border-border flex items-center">
                                        <ShieldCheck className="w-4 h-4 text-primary mr-2" />
                                        <span className="text-xs text-foreground font-medium">Ready for Checkout</span>
                                    </div>
                                </div>

                                {/* Pricing and Actions */}
                                <div className="space-y-6">
                                    {isLoadingPrice && <p>Loading pricing...</p>}
                                    {pricePerSqInch === null && !isLoadingPrice && <p className="text-red-500">Dynamic pricing is not configured.</p>}
                                    
                                    {detectedDimensions && (
                                        <div className="bg-secondary p-4 rounded-xl border border-border">
                                            <div className="flex justify-between items-center text-sm mb-2 text-muted-foreground">
                                                <span className="flex items-center"><Ruler className="w-4 h-4 mr-2"/> Detected Size</span>
                                                <span className="font-mono text-foreground">{detectedDimensions.w.toFixed(1)}" x {detectedDimensions.h.toFixed(1)}"</span>
                                            </div>
                                             <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span className="flex items-center"><DollarSign className="w-4 h-4 mr-2"/> Price / sq. in.</span>
                                                <span className="font-mono text-foreground">{pricePerSqInch ? formatCurrency(pricePerSqInch) : 'N/A'}</span>
                                            </div>
                                            {selectedTier.discount > 0 && (
                                                 <div className="flex justify-between items-center text-sm text-primary mt-2 pt-2 border-t border-border">
                                                    <span className="flex items-center"><Percent className="w-4 h-4 mr-2"/> {selectedTier.label} Discount</span>
                                                    <span className="font-mono text-foreground">{selectedTier.discount}%</span>
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
                                            <p className="text-muted-foreground text-sm">Calculated Price</p>
                                            <p className="text-4xl font-bold text-foreground">{formatCurrency(calculatedPrice)}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-4">
                                         <div className="col-span-1">
                                             <Label className="block text-xs text-muted-foreground mb-1 ml-1">Quantity</Label>
                                             <Input 
                                                type="number" 
                                                min="1" 
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-primary focus:border-primary transition-all"
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
