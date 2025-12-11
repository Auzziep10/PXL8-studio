
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DynamicSheetCartItem, ServiceAddOn, Artwork } from '@/lib/types';
import { Upload, FileText, ArrowRight, Trash2, ShieldCheck, Ruler, DollarSign, Percent, AlertTriangle, Droplet } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export default function SingleTransferUploadPage() {
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
    
    const imageAspectRatio = useRef<number | null>(null);

    const [isColorPickerActive, setIsColorPickerActive] = useState(false);
    
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
        setDimensions({ width: artwork.width.toString(), height: artwork.height.toString() });

        const img = new Image();
        img.onload = () => {
             imageAspectRatio.current = img.naturalWidth / img.naturalHeight;
        };
        img.src = artwork.imageUrl;
        
        // We don't have a real file object, so we create a placeholder name
        setFile({ name: artwork.name } as File);
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

    const removeColor = (imageUrl: string, colorToRemove: {r: number, g: number, b: number}) => {
        return new Promise<string>((resolve, reject) => {
            const img = new Image();
            if (!imageUrl.startsWith('data:')) {
                img.crossOrigin = 'Anonymous';
            }
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Could not get canvas context');
                
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const tolerance = 20;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    if (Math.abs(r - colorToRemove.r) < tolerance && 
                        Math.abs(g - colorToRemove.g) < tolerance && 
                        Math.abs(b - colorToRemove.b) < tolerance) {
                        data[i + 3] = 0; // Make transparent
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL());
            };
            img.onerror = () => reject('Failed to load image for color removal.');
            img.src = imageUrl;
        });
    };

    const handleRemoveColor = async (color: {r: number, g: number, b: number}) => {
        if (!previewUrl) return;
        toast({title: 'Processing...', description: 'Removing selected color from the image.'});
        try {
            const newImageUrl = await removeColor(previewUrl, color);
            setPreviewUrl(newImageUrl);
            toast({title: 'Color Removed!', description: 'The background color has been made transparent.'});
        } catch (error) {
            console.error("Color removal failed:", error);
            toast({variant: 'destructive', title: 'Error', description: 'Could not remove color from image.'});
        } finally {
            setIsColorPickerActive(false);
        }
    };
    
    const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isColorPickerActive || !previewUrl) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const imgElement = e.currentTarget.querySelector('img');
        if (!imgElement) return;

        const imgRect = imgElement.getBoundingClientRect();
        
        // Calculate click position relative to the image element
        const clickX = e.clientX - imgRect.left;
        const clickY = e.clientY - imgRect.top;

        // Calculate the scale of the displayed image vs its natural size
        const scaleX = imgRect.width / imgElement.naturalWidth;
        const scaleY = imgRect.height / imgElement.naturalHeight;

        // Get pixel coordinates on the original image
        const originalX = clickX / scaleX;
        const originalY = clickY / scaleY;

        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(imgElement, 0, 0);
        const pixelData = ctx.getImageData(originalX, originalY, 1, 1).data;
        handleRemoveColor({ r: pixelData[0], g: pixelData[1], b: pixelData[2] });
    };
    
    const resetState = () => {
        setFile(null);
        setPreviewUrl(null);
        setCalculatedPrice(null);
        setQuantity(1);
        setDimensions({ width: '', height: '' });
        imageAspectRatio.current = null;
        setIsColorPickerActive(false);
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
                id: `sng-${Date.now()}`,
                type: 'dynamic_sheet',
                name: `Single Design Transfer`,
                previewUrl: finalSheetPreviewUrl, // The "sheet" is just this one scaled image
                width: width,
                height: height,
                price: calculatedPrice / quantity, // Price per single item
                quantity: quantity,
            };

            onAddToCart(item);
            toast({
                title: 'Added to Cart',
                description: `${quantity} x ${width}" x ${height}" transfers added.`,
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
                    <h1 className="text-4xl font-bold text-white mb-4">Order Single Transfers</h1>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        Upload your design, tell us the size and quantity, and we'll handle the rest. Perfect for ordering multiples of a single artwork.
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
                            <h3 className="text-xl font-medium text-white mb-2">Click to upload your design</h3>
                            <p className="text-zinc-500 text-sm">PNG, JPG, or PDF. 300 DPI recommended.</p>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                {/* Preview Area */}
                                <div 
                                    className={cn(
                                        "flex-grow bg-checkerboard-dark rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center p-4 min-h-[300px]",
                                        isColorPickerActive && "cursor-eyedropper"
                                    )}
                                    onClick={handlePreviewClick}
                                >
                                    {previewUrl && (
                                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-[300px] object-contain shadow-2xl" />
                                    )}
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

                                    <div>
                                        <Button 
                                            variant="outline"
                                            onClick={() => setIsColorPickerActive(prev => !prev)}
                                            className={cn("w-full", isColorPickerActive && 'bg-blue-500/20 border-blue-500')}
                                        >
                                            <Droplet className="w-4 h-4 mr-2" />
                                            {isColorPickerActive ? 'Picker Active - Click on Image' : 'Remove Color'}
                                        </Button>
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
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".png,.jpg,.jpeg" />
                </div>
            </div>
        </div>
    );
};
