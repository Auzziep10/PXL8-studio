'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CartItem, ArtworkOnCanvas, SheetSize as SheetType } from '@/lib/types';
import { Upload, FileText, CheckCircle, ArrowRight, Trash2, ShieldCheck, Ruler } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export default function PrebuiltUploadPage() {
    const { addItem: onAddToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const sheetSizesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'sheetSizes'), where('usage', '==', 'Upload')) : null),
        [firestore]
    );
    const { data: sheetSizes, isLoading: isLoadingSizes } = useCollection<SheetType & {id: string}>(sheetSizesQuery);

    const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [detectedDimensions, setDetectedDimensions] = useState<{w: number, h: number} | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!selectedSizeId && sheetSizes && sheetSizes.length > 0) {
            setSelectedSizeId(sheetSizes[1]?.id || sheetSizes[0].id); // Default to medium or first
        }
    }, [sheetSizes, selectedSizeId]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            setDetectedDimensions(null);
            
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
                        autoSelectSize(widthInch, heightInch);
                    };
                    img.src = result;
                };
                reader.readAsDataURL(uploadedFile);
            } else {
                setPreviewUrl(null);
            }
        }
    };

    const autoSelectSize = (width: number, height: number) => {
        if (!sheetSizes) return;

        let bestFitId: string | null = null;
        let smallestArea = Infinity;

        sheetSizes.forEach((config) => {
            const fitStandard = width <= config.width && height <= config.height;
            if (fitStandard) {
                const area = config.width * config.height;
                if (area < smallestArea) {
                    smallestArea = area;
                    bestFitId = config.id;
                }
            }
        });

        if (bestFitId) {
            setSelectedSizeId(bestFitId);
        }
    };

    const handleAddToCart = async () => {
        if (!file || !previewUrl || !detectedDimensions) {
            toast({
                variant: 'destructive',
                title: 'File required',
                description: 'Please upload a file to continue.',
            });
            return;
        }
        
        if (!selectedSizeId || !sheetSizes) {
            toast({
                variant: 'destructive',
                title: 'Size not selected',
                description: 'Please select a sheet size.',
            });
            return;
        }

        setIsProcessing(true);
        try {
            const sheetConfig = sheetSizes.find(s => s.id === selectedSizeId);
            if (!sheetConfig) throw new Error("Selected size not found");

            // Create a single artwork item representing the entire uploaded sheet
            const uploadedArtwork: ArtworkOnCanvas = {
                id: `prebuilt-art-${Date.now()}`,
                name: file.name,
                imageUrl: previewUrl,
                width: detectedDimensions.w,
                height: detectedDimensions.h,
                dpi: 300, // Assume 300 dpi for uploaded file
                x: 0,
                y: 0,
                canvasWidth: detectedDimensions.w,
                canvasHeight: detectedDimensions.h,
                quantity: 1, // Quantity is handled at the cart item level
            };

            const item: CartItem = {
                id: `prebuilt-${Date.now()}`,
                sheetSize: sheetConfig,
                previewUrl: previewUrl, // The uploaded image serves as its own preview
                artworks: [uploadedArtwork], // Embed the single artwork
                quantity: quantity,
            };

            onAddToCart(item);
            toast({
                title: 'Added to Cart',
                description: `${quantity} x ${sheetConfig.width}" x ${sheetConfig.height}" pre-built sheet added.`,
            });
            
            // Reset state
            setFile(null);
            setPreviewUrl(null);
            setDetectedDimensions(null);
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
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-12 text-center">
                    <h1 className="text-4xl font-bold text-white mb-4">Upload Ready-to-Print Sheet</h1>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        Already have your gang sheet built in Illustrator, Photoshop, or Canva? 
                        Upload your finished file here. We accept PDF, PNG, AI, and PSD.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Size Selection */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold border border-primary/50">1</span>
                                <h2 className="text-xl font-bold text-white">Select Sheet Size</h2>
                            </div>
                            {detectedDimensions && (
                                <span className="text-xs font-mono text-accent flex items-center bg-accent/10 px-2 py-1 rounded border border-accent/20">
                                    <Ruler className="w-3 h-3 mr-1" />
                                    Detected: {detectedDimensions.w.toFixed(1)}" x {detectedDimensions.h.toFixed(1)}"
                                </span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 builder-scroll">
                             {isLoadingSizes ? (
                                <p>Loading sizes...</p>
                             ) : sheetSizes?.length === 0 ? (
                                <p className="text-zinc-400 col-span-2">No pricing tiers available for "Upload". Please configure them in the admin pricing manager.</p>
                             ) : sheetSizes?.map((config) => (
                                <label 
                                    key={config.id} 
                                    className={`relative group cursor-pointer rounded-2xl border p-6 transition-all duration-300 ${
                                        selectedSizeId === config.id 
                                        ? 'bg-zinc-800/80 border-primary ring-1 ring-primary/50 shadow-[0_0_20px_rgba(255,138,0,0.1)]' 
                                        : 'bg-zinc-900/40 border-white/10 hover:border-white/20 hover:bg-zinc-800/60'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="sheetSize"
                                        value={config.id}
                                        checked={selectedSizeId === config.id}
                                        onChange={(e) => setSelectedSizeId(e.target.value)}
                                        className="sr-only"
                                    />
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-lg ${selectedSizeId === config.id ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        {selectedSizeId === config.id && <CheckCircle className="w-6 h-6 text-primary" />}
                                    </div>
                                    <div className="mb-1">
                                         <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">{config.name}</span>
                                         <h3 className="text-lg font-bold text-white">{config.width}" x {config.height}"</h3>
                                    </div>
                                    <p className="text-sm text-zinc-400 mb-4">Perfect for bulk runs</p>
                                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                                        <span className="text-2xl font-bold text-white">${config.price.toFixed(2)}</span>
                                        <span className="text-xs text-zinc-500 font-mono">/sheet</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Upload */}
                    <div className="space-y-6">
                         <div className="flex items-center space-x-3 mb-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent text-sm font-bold border border-accent/50">2</span>
                            <h2 className="text-xl font-bold text-white">Upload File</h2>
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

                                    {/* Preview Area */}
                                    <div className="flex-grow bg-checkerboard-dark rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center p-4 mb-6">
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

                                    {/* Quantity & Add */}
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
                                            disabled={isProcessing}
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
                            )}
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".png,.jpg,.jpeg,.pdf,.ai,.psd" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
