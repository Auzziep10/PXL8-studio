'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, sanitizeFilename } from '@/lib/utils';
import { ServiceAddOn, SheetCartItem, ArtworkOnCanvas } from '@/lib/types';
import { 
    Upload, 
    Trash2, 
    ArrowRight, 
    ArrowLeft, 
    Wand2, 
    Layers, 
    Droplet, 
    Sparkles, 
    AlertTriangle, 
    ShieldCheck, 
    Ruler, 
    DollarSign, 
    Check,
    Cpu
} from 'lucide-react';

type Step = 
    | 'EXPERIENCE_LEVEL' 
    | 'BEGINNER_OPTIONS' 
    | 'EXPRO_DECORATION' 
    | 'BEGINNER_DECORATION_DESIGN' 
    | 'BEGINNER_DECORATION_UPLOAD' 
    | 'BEGINNER_UPLOAD_CONFIGURE'
    | 'EXPRO_ACTIONS';

type DecorationType = 'dtf' | 'vinyl';

export default function CustomerPathWizard() {
    const router = useRouter();
    const { addItem: onAddToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    // --- State Variables ---
    const [step, setStep] = useState<Step>('EXPERIENCE_LEVEL');
    const [history, setHistory] = useState<Step[]>([]);
    
    // Selections
    const [experience, setExperience] = useState<'beginner' | 'pro' | null>(null);
    const [beginnerStartMode, setBeginnerStartMode] = useState<'design' | 'upload' | null>(null);
    const [decoration, setDecoration] = useState<DecorationType>('dtf');
    const [exproAction, setExproAction] = useState<'builder' | 'upload' | null>(null);

    // Beginner Upload Flow
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [dimensions, setDimensions] = useState<{ width: string; height: string }>({ width: '', height: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageAspectRatio = useRef<number | null>(null);

    // --- Query Pricing from Firestore ---
    const sqInchPriceQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'serviceAddOns'), where('type', '==', 'per_sq_inch')) : null),
        [firestore]
    );
    const { data: sqInchPriceData, isLoading: isLoadingPrice } = useCollection<ServiceAddOn & { id: string }>(sqInchPriceQuery);
    
    const pricePerSqInch = useMemo(() => {
        if (sqInchPriceData && sqInchPriceData.length > 0) {
            return sqInchPriceData[0].price;
        }
        return 0.05; // Fallback resolved to $0.05 per sq in
    }, [sqInchPriceData]);

    // --- Navigation Helpers ---
    const navigateTo = (nextStep: Step) => {
        setHistory(prev => [...prev, step]);
        setStep(nextStep);
    };

    const handleBack = () => {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setHistory(prevHistory => prevHistory.slice(0, -1));
            setStep(prev);
        }
    };

    // --- Experience Selection ---
    const handleSelectExperience = (level: 'beginner' | 'pro') => {
        setExperience(level);
        if (level === 'beginner') {
            navigateTo('BEGINNER_OPTIONS');
        } else {
            navigateTo('EXPRO_DECORATION');
        }
    };

    // --- Beginner Option Selection ---
    const handleSelectBeginnerOption = (mode: 'design' | 'upload') => {
        setBeginnerStartMode(mode);
        if (mode === 'design') {
            navigateTo('BEGINNER_DECORATION_DESIGN');
        } else {
            navigateTo('BEGINNER_DECORATION_UPLOAD');
        }
    };

    // --- Decoration Type Selection ---
    const handleSelectDecoration = (type: DecorationType) => {
        setDecoration(type);
        if (experience === 'beginner') {
            if (beginnerStartMode === 'design') {
                // Launch Design Studio with appropriate query params
                router.push(`/design-studio?flow=beginner&type=${type}`);
            } else {
                navigateTo('BEGINNER_UPLOAD_CONFIGURE');
            }
        } else {
            navigateTo('EXPRO_ACTIONS');
        }
    };

    // --- Experienced Pro Action Selection ---
    const handleSelectExproAction = (action: 'builder' | 'upload') => {
        setExproAction(action);
        if (action === 'builder') {
            router.push(`/build?type=${decoration}`);
        } else {
            if (decoration === 'vinyl') {
                router.push('/elevated-flex');
            } else {
                router.push(`/upload?type=${decoration}`);
            }
        }
    };

    // --- Beginner Single Design Upload Handlers ---
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
                 setDimensions(prev => ({ ...prev, [name]: value }));
            }
        } else {
            setDimensions(prev => ({ ...prev, [name]: value }));
        }
    };

    const resetState = () => {
        setFile(null);
        setPreviewUrl(null);
        setQuantity(1);
        setDimensions({ width: '', height: '' });
        imageAspectRatio.current = null;
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Calculate dynamic pricing based on single design dimensions and quantity
    const calculatedPrice = useMemo(() => {
        const width = parseFloat(dimensions.width);
        const height = parseFloat(dimensions.height);

        if (width > 0 && height > 0 && pricePerSqInch > 0) {
            const area = width * height;
            return area * pricePerSqInch * quantity;
        }
        return 0;
    }, [dimensions, quantity, pricePerSqInch]);

    // --- Auto Layout Engine (Canvas) ---
    const handleGenerateSheetAndCheckout = async () => {
        const width = parseFloat(dimensions.width);
        const height = parseFloat(dimensions.height);

        if (!file || !previewUrl || !(width > 0) || !(height > 0) || calculatedPrice === 0) {
            toast({
                variant: 'destructive',
                title: 'Cannot Proceed',
                description: 'Please upload a design and configure dimensions.',
            });
            return;
        }

        setIsGenerating(true);
        setGenerationProgress(10);

        try {
            const rollWidth = 22; // 22 inches standard
            const gap = 0.3; // 0.3 inches gap
            const dpi = 300;

            // Calculate Grid
            const cols = Math.max(1, Math.floor((rollWidth + gap) / (width + gap)));
            const rows = Math.ceil(quantity / cols);
            const sheetHeight = rows * height + (rows - 1) * gap;

            setGenerationProgress(30);

            // Create Canvas
            const canvas = document.createElement('canvas');
            canvas.width = rollWidth * dpi;
            canvas.height = sheetHeight * dpi;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not construct 2D context");

            // Draw clean background
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            setGenerationProgress(50);

            // Load original image
            const img = new window.Image();
            img.crossOrigin = 'Anonymous';
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Failed to load source image"));
                img.src = previewUrl;
            });

            setGenerationProgress(75);

            // Draw grid copies onto the canvas
            const artworksList: ArtworkOnCanvas[] = [];
            for (let i = 0; i < quantity; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const xInches = col * (width + gap);
                const yInches = row * (height + gap);

                ctx.drawImage(
                    img,
                    xInches * dpi,
                    yInches * dpi,
                    width * dpi,
                    height * dpi
                );

                artworksList.push({
                    id: `art-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
                    imageUrl: previewUrl,
                    width: width,
                    height: height,
                    dpi: dpi,
                    x: xInches,
                    y: yInches,
                    rotation: 0,
                    canvasWidth: width * dpi,
                    canvasHeight: height * dpi,
                    quantity: 1
                });
            }

            setGenerationProgress(90);

            // Export as PNG
            const finalSheetPreviewUrl = canvas.toDataURL('image/png');

            const cartItem: SheetCartItem = {
                id: `GNG-AUTO-${Date.now()}`,
                type: 'sheet',
                sheetSize: {
                    name: `Auto-Layout 22" x ${sheetHeight.toFixed(0)}" (${decoration.toUpperCase()})`,
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

            onAddToCart(cartItem);
            setGenerationProgress(100);

            toast({
                title: 'Gang Sheet Auto-Generated!',
                description: `Successfully laid out ${quantity} copies onto a 22" x ${sheetHeight.toFixed(0)}" sheet and added to checkout.`,
            });

            resetState();
            router.push('/cart');

        } catch (err) {
            console.error("Error generating sheet:", err);
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: 'Failed to automatically align artwork. Please try again.',
            });
        } finally {
            setIsGenerating(false);
            setGenerationProgress(0);
        }
    };

    return (
        <div className="w-full h-full flex flex-col md:flex-row gap-6 max-w-none px-6 py-2 flex-grow relative">
            {/* Beginner Card */}
            <div className="flex-1 rounded-[2rem] overflow-hidden relative border border-zinc-200/50 shadow-md flex flex-col justify-end p-8 sm:p-16 lg:p-24 min-h-[400px] md:min-h-[500px] group transition-all duration-300">
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: "url('/dtf_transfers_beginner.png')" }}
                />
                <div className="absolute inset-0 bg-black/45 group-hover:bg-black/40 transition-colors duration-300" />
                <div className="relative z-10 space-y-4 flex flex-col items-start text-left text-white max-w-lg">
                    <span className="text-[9px] font-mono tracking-widest text-zinc-300 uppercase">01 / DESIGN YOURS</span>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal leading-tight">Design Your Transfers</h2>
                    <p className="text-zinc-200 text-xs sm:text-sm font-light leading-relaxed">
                        Configure a custom print layout. Simply upload single designs, set your dimensions and quantity, and our system will automatically fit them onto a standard 22" DTF transfer roll.
                    </p>
                    <button 
                        onClick={() => handleSelectExperience('beginner')}
                        className="bg-white hover:bg-zinc-50 text-zinc-900 text-[10px] font-bold uppercase tracking-widest px-6 h-12 rounded-full flex items-center justify-between gap-4 transition-all mt-4 w-full sm:w-auto"
                    >
                        <span>START DESIGNING</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Pro Card */}
            <div className="flex-1 rounded-[2rem] overflow-hidden relative border border-zinc-200/50 shadow-md flex flex-col justify-end p-8 sm:p-16 lg:p-24 min-h-[400px] md:min-h-[500px] group transition-all duration-300">
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: "url('/dtf_transfers_pro.png')" }}
                />
                <div className="absolute inset-0 bg-white/45 group-hover:bg-white/40 transition-colors duration-300" />
                <div className="relative z-10 space-y-4 flex flex-col items-start text-left text-zinc-900 max-w-lg">
                    <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase">02 / BUILD GANG SHEET</span>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal leading-tight">Build From Basics</h2>
                    <p className="text-zinc-800 text-xs sm:text-sm font-light leading-relaxed">
                        Start from scratch on our advanced canvas builder to drag, scale, and align multiple custom designs, or upload your finished print-ready gang sheets directly.
                    </p>
                    <button 
                        onClick={() => handleSelectExperience('pro')}
                        className="bg-black hover:bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest px-6 h-12 rounded-full flex items-center justify-between gap-4 transition-all mt-4 w-full sm:w-auto"
                    >
                        <span>OPEN CANVAS BUILDER</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Overlay Modal for Step 2+ */}
            {step !== 'EXPERIENCE_LEVEL' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#FAF9F6] border border-zinc-200/80 shadow-2xl p-8 rounded-[2rem] max-w-2xl w-full text-zinc-900 flex flex-col justify-between max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
                        
                        {/* Close/Back Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200/50">
                            <Button variant="ghost" onClick={handleBack} className="text-zinc-650 hover:text-zinc-900 flex items-center gap-2 h-9 px-3 rounded-full hover:bg-zinc-150">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </Button>
                            <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">
                                Path: {experience === 'beginner' ? 'Beginner' : 'Pro'} 
                                {beginnerStartMode ? ` > ${beginnerStartMode === 'design' ? 'Design' : 'Upload'}` : ''}
                                {decoration ? ` > ${decoration.toUpperCase()}` : ''}
                            </span>
                        </div>

                        {/* Render the active sub-step view */}
                        <div className="flex-grow">
                            {/* Step 2a: Beginner Options */}
                            {step === 'BEGINNER_OPTIONS' && (
                                <div className="text-center space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-serif text-zinc-900 font-normal">How would you like to start?</h2>
                                        <p className="text-sm text-zinc-500 font-light">Choose between creating an image or uploading an existing logo.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                        <div 
                                            onClick={() => handleSelectBeginnerOption('design')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Sparkles className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">Help Me Design</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Launch our Design Studio to generate artwork from a text prompt or add custom text and filters.
                                            </p>
                                        </div>

                                        <div 
                                            onClick={() => handleSelectBeginnerOption('upload')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Upload className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">Upload My Design</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Upload a single image file, tell us the width/height and quantity, and we will lay it out automatically.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3a/b: Decoration Type for Beginner Design or Upload */}
                            {(step === 'BEGINNER_DECORATION_DESIGN' || step === 'BEGINNER_DECORATION_UPLOAD') && (
                                <div className="text-center space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-serif text-zinc-900 font-normal">Choose Decoration Type</h2>
                                        <p className="text-sm text-zinc-500 font-light">Select the material method that fits your design best.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                        <div 
                                            onClick={() => handleSelectDecoration('dtf')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Droplet className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">DTF Transfers</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Direct-To-Film. Full-color, high-detail prints with unlimited shades. Excellent for complex multi-color designs.
                                            </p>
                                        </div>

                                        <div 
                                            onClick={() => handleSelectDecoration('vinyl')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Layers className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">Vinyl Transfers</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Elevated Flex. Thick, textured transfers ideal for bold, solid-color vector shapes, sports numbering, or basic logo cuts.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2b: Experienced Pro Decoration Type Selection */}
                            {step === 'EXPRO_DECORATION' && (
                                <div className="text-center space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-serif text-zinc-900 font-normal">Select Decoration Type</h2>
                                        <p className="text-sm text-zinc-500 font-light">What material type are you formatting your gang sheets for?</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                        <div 
                                            onClick={() => handleSelectDecoration('dtf')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Droplet className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">DTF Transfers</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Full-color digital prints. Stretchable, high-opacity film transfer.
                                            </p>
                                        </div>

                                        <div 
                                            onClick={() => handleSelectDecoration('vinyl')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Layers className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">Vinyl (Elevated Flex)</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Premium raised texture cuts for solid vector designs.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3c: Experienced Pro Action Selector */}
                            {step === 'EXPRO_ACTIONS' && (
                                <div className="text-center space-y-6">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-serif text-zinc-900 font-normal">How would you like to submit your sheet?</h2>
                                        <p className="text-sm text-zinc-500 font-light">Select whether to build on our canvas tool or drop your ready-made roll files.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                        <div 
                                            onClick={() => handleSelectExproAction('builder')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Layers className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">Gang Sheet Builder</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Open our advanced interactive builder workspace. Drag, drop, scale, rotate, and duplicate designs onto our layout sheets.
                                            </p>
                                        </div>

                                        <div 
                                            onClick={() => handleSelectExproAction('upload')}
                                            className="bg-white hover:bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 p-6 rounded-2xl transition-all cursor-pointer flex flex-col items-center space-y-4 group"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                                                <Upload className="w-6 h-6 text-zinc-650" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-zinc-900">Gang Sheet Upload</h3>
                                            <p className="text-xs text-zinc-500 text-center font-light leading-relaxed">
                                                Upload finished, print-ready gang sheet files directly. Perfect if you generated your layout in Photoshop or Illustrator.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4a: Beginner Configure Sizing, Uploading, and Auto-Generation */}
                            {step === 'BEGINNER_UPLOAD_CONFIGURE' && (
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-3xl font-serif text-zinc-900 font-normal">Upload Your Artwork</h2>
                                        <p className="text-sm text-zinc-500 font-light">Upload a single image and configure its size and quantity.</p>
                                    </div>

                                    {isGenerating ? (
                                        <div className="bg-white border border-zinc-200 rounded-2xl p-12 flex flex-col items-center justify-center space-y-6 text-center min-h-[300px]">
                                            <div className="relative w-24 h-24 flex items-center justify-center">
                                                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                                <Cpu className="w-8 h-8 text-cyan-600 animate-pulse" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold text-zinc-900">Arranging Print Layout...</h3>
                                                <p className="text-xs text-zinc-500">Placing {quantity} copies on a 22"-wide roll</p>
                                            </div>
                                            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                                                <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${generationProgress}%` }}></div>
                                            </div>
                                            <span className="text-[10px] text-zinc-400 font-mono">{generationProgress}% Completed</span>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Upload Area */}
                                            <div className="bg-white border-dashed border-2 border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center min-h-[300px]">
                                                {!file ? (
                                                    <div 
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center py-6"
                                                    >
                                                        <div className="w-14 h-14 bg-zinc-50 rounded-full flex items-center justify-center mb-4 group hover:scale-110 transition-transform duration-300 border border-zinc-100">
                                                            <Upload className="w-6 h-6 text-zinc-400 group-hover:text-cyan-600 transition-colors" />
                                                        </div>
                                                        <h3 className="text-base font-bold text-zinc-900 mb-1">Select your design file</h3>
                                                        <p className="text-zinc-500 text-[10px] max-w-xs mx-auto mb-4 leading-relaxed">
                                                            Supports PNG, JPG, JPEG, and SVG. Transparent PNG is highly recommended.
                                                        </p>
                                                        <Button variant="outline" size="sm" className="rounded-full border-zinc-300" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                                            Select File
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col justify-between">
                                                        <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl mb-4 text-xs">
                                                            <div className="truncate flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded bg-zinc-150 flex items-center justify-center text-cyan-600 flex-shrink-0">
                                                                    <Check className="w-3 h-3" />
                                                                </div>
                                                                <span className="text-zinc-700 truncate max-w-[150px]">{file.name}</span>
                                                            </div>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={resetState}
                                                                className="w-8 h-8 text-zinc-400 hover:text-red-500 hover:bg-transparent"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>

                                                        <div className="flex-grow checkerboard rounded-xl border border-zinc-200/60 relative overflow-hidden flex items-center justify-center p-4 min-h-[180px]">
                                                            {previewUrl && (
                                                                <img src={previewUrl} alt="Artwork preview" className="max-w-full max-h-[160px] object-contain shadow-md" />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept=".png,.jpg,.jpeg,.svg" />
                                            </div>

                                            {/* Configurations & Summary */}
                                            <div className="bg-white border border-zinc-200/80 p-6 rounded-2xl flex flex-col justify-between space-y-4">
                                                <div className="space-y-4">
                                                    <h3 className="text-base font-bold text-zinc-900">Configure Sizing & Qty</h3>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className="text-zinc-650 text-[11px] mb-1 block flex items-center gap-1">
                                                                <Ruler className="w-3.5 h-3.5 text-zinc-400" /> Width (inches)
                                                            </Label>
                                                            <Input 
                                                                name="width" 
                                                                type="number" 
                                                                placeholder="Width"
                                                                value={dimensions.width}
                                                                onChange={handleDimensionChange}
                                                                disabled={!file}
                                                                className="bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400 rounded-lg h-9"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-zinc-650 text-[11px] mb-1 block flex items-center gap-1">
                                                                <Ruler className="w-3.5 h-3.5 text-zinc-400" /> Height (inches)
                                                            </Label>
                                                            <Input 
                                                                name="height" 
                                                                type="number" 
                                                                placeholder="Height"
                                                                value={dimensions.height}
                                                                onChange={handleDimensionChange}
                                                                disabled={!file}
                                                                className="bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400 rounded-lg h-9"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <Label className="text-zinc-650 text-[11px] mb-1 block">Quantity of Copies</Label>
                                                        <Input 
                                                            type="number" 
                                                            min="1" 
                                                            value={quantity}
                                                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                            disabled={!file}
                                                            className="bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-400 rounded-lg h-9"
                                                        />
                                                    </div>

                                                    {file && dimensions.width && dimensions.height && (
                                                        <div className="bg-zinc-50 rounded-xl border border-zinc-200/60 p-4 space-y-2 text-xs">
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-500 flex items-center"><DollarSign className="w-3.5 h-3.5 text-zinc-400 mr-1"/> Price per sq inch:</span>
                                                                <span className="font-mono text-zinc-700">{formatCurrency(pricePerSqInch)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-zinc-500">Total area:</span>
                                                                <span className="font-mono text-zinc-700">{(parseFloat(dimensions.width) * parseFloat(dimensions.height) * quantity).toFixed(1)} sq in</span>
                                                            </div>
                                                            <div className="border-t border-zinc-200 pt-2 flex justify-between items-center text-sm font-bold text-zinc-900">
                                                                <span>Estimated Price:</span>
                                                                <span className="text-zinc-900">{formatCurrency(calculatedPrice)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <Button 
                                                    onClick={handleGenerateSheetAndCheckout}
                                                    disabled={!file || !dimensions.width || !dimensions.height || calculatedPrice === 0}
                                                    className="w-full text-xs h-10 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full font-semibold uppercase tracking-wider flex items-center justify-center gap-2 mt-4"
                                                >
                                                    Generate Gang Sheet & Checkout <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
