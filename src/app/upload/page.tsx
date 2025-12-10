'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DynamicSheetCartItem, ServiceAddOn } from '@/lib/types';
import { Upload, FileText, CheckCircle, ArrowRight, Trash2, ShieldCheck, Ruler, DollarSign } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';

export default function PrebuiltUploadPage() {
    const { addItem: onAddToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const sqInchPriceQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'serviceAddOns'), where('type', '==', 'per_sq_inch')) : null),
        [firestore]
    );
    const { data: sqInchPriceData, isLoading: isLoadingPrice } = useCollection<ServiceAddOn & {id: string}>(sqInchPriceQuery);
    
    const pricePerSqInch = useMemo(() => {
        if (sqInchPriceData && sqInchPriceData.length > 0) {
            return sqInchPriceData[0].price;
        }
        return null;
    }, [sqInchPriceData]);


    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [detectedDimensions, setDetectedDimensions] = useState<{w: number, h: number} | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (detectedDimensions && pricePerSqInch !== null) {
            const area = detectedDimensions.w * detectedDimensions.h;
            const price = area * pricePerSqInch;
            setCalculatedPrice(price);
        } else {
            setCalculatedPrice(null);
        }
    }, [detectedDimensions, pricePerSqInch]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            setDetectedDimensions(null);
            setCalculatedPrice(null);
            
            if (uploadedFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    setPreviewUrl(result);

                    const img = new Image();
                    img.onload = () => {
                        const dpi = 300;
                        const widthInch = img.naturalWidth / dpi;
                        const heightInch = img.naturalHeight / dpi;
                        
                        setDetectedDimensions({ w: widthInch, h: heightInch });
                    };
                    img.src = result;
                };
                reader.readAsDataURL(uploadedFile);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const handleAddToCart = async () => {
        if (!file || !previewUrl || !detectedDimensions || calculatedPrice === null) {
            toast({
                variant: 'destructive',
                title: 'File and Price Required',
                description: 'Please upload a valid image to calculate the price.',
            });
            return;
        }

        setIsProcessing(true);
        try {
            const item: DynamicSheetCartItem = {
                id: `dyn-${Date.now()}`,
                type: 'dynamic_sheet',
                name: file.name,
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
            
            setFile(null);
            setPreviewUrl(null);
            setDetectedDimensions(null);
            setCalculatedPrice(null);
            setQuantity(1);

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
                        Already have your gang sheet built? Upload your finished PNG, PDF, AI, or PSD file here. 
                        We'll automatically detect the size and calculate the price for you.
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
                            <h3 className="text-xl font-medium text-white mb-2">Click to upload or drag and drop</h3>
                            <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-6">
                                PDF, PNG, AI, or PSD. 300 DPI Recommended. Background must be transparent.
                            </p>
                            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
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
                                    onClick={() => { setFile(null); setPreviewUrl(null); setDetectedDimensions(null); }}
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
                                        </div>
                                    )}

                                    {calculatedPrice !== null && (
                                        <div className="text-center">
                                            <p className="text-zinc-400 text-sm">Calculated Price</p>
                                            <p className="text-4xl font-bold text-white">{formatCurrency(calculatedPrice)}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-4">
                                         <div className="col-span-1">
                                             <label className="block text-xs text-zinc-400 mb-1 ml-1">Quantity</label>
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
                                            disabled={isProcessing || calculatedPrice === null}
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
