'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GangSheetItem, CartItem, ArtworkOnCanvas, Artwork, SheetSize as SheetType } from '@/lib/types';
import { PPI } from '@/lib/constants';
import { Upload, Trash2, AlertTriangle, Wand2, Info, ArrowRight, Plus, Copy, Move, ArrowLeftRight, ArrowUpDown, Save, QrCode } from 'lucide-react';
import { analyzeArtwork } from '@/app/actions';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import AiAnalysisPanel from './ai-analysis-panel';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { Button } from './ui/button';
import { uploadFileAndGetURL } from '@/firebase/storage';
import QRCode from 'qrcode';


// Debounce function to limit how often we save to Firestore
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}


export default function GangSheetBuilder({ newArtworks }: { newArtworks?: Artwork[] }) {
  const { addItem: addToCart } = useCart();
  const { toast } = useToast();
  const [items, setItems] = useState<ArtworkOnCanvas[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const sheetSizesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sheetSizes') : null),
    [firestore]
  );
  const { data: sheetSizes, isLoading: isLoadingSizes } = useCollection<SheetType & {id: string}>(sheetSizesQuery);

  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);

  // Reference to the user's gang sheet document in Firestore
  const gangSheetDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/drafts/gang-sheet`);
  }, [firestore, user]);

  // Load data from Firestore
  const { data: savedSheet, isLoading: isSheetLoading } = useDoc(gangSheetDocRef);

  // State to track if data has been loaded from Firestore
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!selectedSizeId && sheetSizes && sheetSizes.length > 0) {
      setSelectedSizeId(sheetSizes[1]?.id || sheetSizes[0].id); // Default to medium or first
    }
  }, [sheetSizes, selectedSizeId]);


  useEffect(() => {
    if (newArtworks && newArtworks.length > 0) {
        newArtworks.forEach(artwork => handleImageLoad(artwork.imageUrl, true, artwork.name, artwork));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newArtworks]);

   // Effect to load data from localStorage or Firestore
  useEffect(() => {
    if (isUserLoading || isSheetLoading) return; // Wait until we know auth state & have Firestore data

    if (user && savedSheet && !isLoaded) {
      // User is logged in, and we have a saved sheet from the cloud
      setItems(savedSheet.items || []);
      setSelectedSizeId(savedSheet.selectedSizeId || null);
      setIsLoaded(true); // Mark as loaded to prevent re-loading
      // Clear any local guest data
      localStorage.removeItem('guest-gang-sheet');
    } else if (!user && !isLoaded) {
      // Guest user, load from localStorage
      try {
        const guestData = localStorage.getItem('guest-gang-sheet');
        if (guestData) {
          const parsedData = JSON.parse(guestData);
          setItems(parsedData.items || []);
          setSelectedSizeId(parsedData.selectedSizeId || null);
        }
      } catch (error) {
        console.error("Failed to load guest sheet from localStorage", error);
      }
      setIsLoaded(true);
    } else if (!isSheetLoading && !isLoaded) {
      // No saved sheet (either guest or new user)
      setIsLoaded(true);
    }
  }, [user, savedSheet, isUserLoading, isSheetLoading, isLoaded]);

  // Debounced save function for Firestore
  const debouncedSaveToFirestore = useCallback(
    debounce((sheetData: { items: ArtworkOnCanvas[], selectedSizeId: string | null }) => {
      if (gangSheetDocRef) {
        const storableItems = sheetData.items.map(item => {
            const { analysis, imageUrl, ...rest } = item;
             // Ensure imageUrl is a permanent URL, not a temp data URL
            if (!imageUrl || imageUrl.startsWith('data:')) {
                // This shouldn't happen for logged-in users, but as a safeguard
                console.warn(`Item ${item.id} has a temporary URL and won't be saved to Firestore.`);
                return null;
            }
            const storableAnalysis = analysis ? { ...analysis, imageDataUri: '' } : undefined;
            const itemToStore: any = { ...rest, imageUrl };
            if (storableAnalysis) itemToStore.analysis = storableAnalysis;
            return itemToStore;
        }).filter(Boolean); // Filter out any null items

        const storableSheetData = {
            ...sheetData,
            items: JSON.parse(JSON.stringify(storableItems)),
            updatedAt: serverTimestamp()
        };
        
        setDoc(gangSheetDocRef, storableSheetData, { merge: true }).catch((err) => {
            console.error("Failed to save sheet:", err);
            // Handle specific errors as before
        });
      }
    }, 1500),
    [gangSheetDocRef]
  );
  
  // Effect to save data to Firestore or localStorage
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial data is loaded

    if (user) {
      // Logged-in user: save to Firestore
      debouncedSaveToFirestore({ items, selectedSizeId });
    } else {
      // Guest user: save to localStorage
      try {
         const guestData = { items, selectedSizeId };
         const storableGuestData = JSON.stringify(guestData);
         localStorage.setItem('guest-gang-sheet', storableGuestData);
      } catch (error) {
        console.error("Failed to save guest sheet to localStorage", error);
      }
    }
  }, [items, selectedSizeId, user, isLoaded, debouncedSaveToFirestore]);


  // Duplication State
  const [duplicateCount, setDuplicateCount] = useState(1);
  
  // Dragging State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [isGenerating, setIsGenerating] = useState(false);

  const sheetConfig = sheetSizes?.find(s => s.id === selectedSizeId) || { width: 0, height: 0, price: 0};
  const selectedItem = items.find(item => item.id === selectedItemId);

  // --- Auto-Scaling for Preview ---
  useEffect(() => {
    const handleResize = () => {
        if (!containerRef.current) return;
        const containerW = containerRef.current.clientWidth;
        const availableW = Math.max(0, containerW - 90); 
        const sheetPxW = sheetConfig.width * PPI;
        
        let newScale = availableW / sheetPxW;
        newScale = Math.min(Math.max(newScale, 0.05), 1.0);
        
        setScale(newScale);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [selectedSizeId, sheetConfig.width]); 

  const displayWidth = sheetConfig.width * PPI * scale;
  const displayHeight = sheetConfig.height * PPI * scale;

  // --- Auto-Positioning Algorithm ---
  const findOpenPosition = (width: number, height: number, existingItems: ArtworkOnCanvas[]): {x: number, y: number} => {
    const margin = 0.25; // inch margin
    const step = 0.5; // check every half inch

    // Simple scan: Top to bottom, left to right
    for (let y = margin; y < sheetConfig.height - height; y += step) {
        for (let x = margin; x < sheetConfig.width - width; x += step) {
            
            // Check collision with all existing items at this position
            const collision = existingItems.some(item => {
                return !(
                    x + width + margin <= item.x ||    // New is to left of Existing
                    x >= item.x + item.width + margin || // New is to right of Existing
                    y + height + margin <= item.y ||   // New is above Existing
                    y >= item.y + item.height + margin   // New is below Existing
                );
            });

            if (!collision) {
                return { x, y };
            }
        }
    }
    // Fallback: Place at 0,0 (Overlap will be visually flagged)
    return { x: 0, y: 0 };
  };

  const handleImageLoad = (imageUrl: string, isPermanent: boolean, fileName: string, existingArtwork?: Artwork) => {
    const img = new window.Image();
    if (isPermanent) img.crossOrigin = "Anonymous";

    img.onload = () => {
        let w, h, dpi;
        if (existingArtwork) {
            w = existingArtwork.width;
            h = existingArtwork.height;
            dpi = existingArtwork.dpi;
        } else {
            dpi = 300; // Assume 300 DPI for new uploads
            w = parseFloat((img.width / dpi).toFixed(2));
            h = parseFloat((img.height / dpi).toFixed(2));
        }

        const pos = findOpenPosition(w, h, items);

        const newItem: ArtworkOnCanvas = {
          id: Date.now().toString(),
          name: fileName,
          imageUrl: imageUrl,
          width: w,
          height: h,
          quantity: 1,
          dpi: dpi,
          x: pos.x,
          y: pos.y,
          canvasWidth: w * PPI,
          canvasHeight: h * PPI
        };

        setItems(prev => [...prev, newItem]);
        setSelectedItemId(newItem.id);
        setDuplicateCount(1);
        toast({ title: 'Upload complete!', description: 'Your artwork has been added to the sheet.' });
    };
    img.onerror = () => {
        toast({ variant: 'destructive', title: 'Image Load Failed', description: 'Could not load the image to place it on the canvas.' });
    };
    img.src = imageUrl;
  };


  // --- File Upload ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    if (user) {
        // Logged-in user: upload to Firebase Storage
        toast({ title: 'Uploading...', description: 'Your image is being uploaded to secure storage.' });
        try {
            const permanentUrl = await uploadFileAndGetURL(file, user.uid);
            handleImageLoad(permanentUrl, true, file.name);
        } catch (error) {
            console.error("File upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your image. Please try again.' });
        }
    } else {
        // Guest user: use local data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const localUrl = e.target?.result as string;
            handleImageLoad(localUrl, false, file.name);
        };
        reader.onerror = () => {
             toast({ variant: 'destructive', title: 'File Read Failed', description: 'Could not read the selected file.' });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedItem) return;

    updateItem(selectedItem.id, { analysisLoading: true });
    
    // We need to read the image data from the URL for analysis.
    // This is a temporary client-side data fetch for the AI function.
    // It doesn't get saved to Firestore.
    try {
        const response = await fetch(selectedItem.imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = reader.result as string;

            const result = await analyzeArtwork({ 
                artworkDataUri: base64data,
                artworkDescription: selectedItem.name,
            });

            if (result.success && result.data) {
                updateItem(selectedItem.id, { analysis: result.data, analysisLoading: false });
            } else {
                throw new Error(result.error || "Unknown analysis error");
            }
        };
    } catch (error) {
        console.error("Analysis failed:", error);
        toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: (error as Error).message || "Could not analyze the artwork."
        });
        updateItem(selectedItem.id, { analysisLoading: false });
    }
  }


  // --- Item Management ---
  const updateItem = (id: string, updates: Partial<ArtworkOnCanvas>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => {
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
  };

  const handleBulkDuplicate = (itemToClone: ArtworkOnCanvas, count: number) => {
      const newItems: ArtworkOnCanvas[] = [];
      // We must check against both original items AND the newly added duplicates 
      // so they don't stack on top of each other.
      let currentItemsForCheck = [...items];

      for (let i = 0; i < count; i++) {
          const pos = findOpenPosition(itemToClone.width, itemToClone.height, currentItemsForCheck);
          
          const newItem: Omit<ArtworkOnCanvas, 'analysis' | 'analysisLoading'> & { analysis?: any } = {
              ...itemToClone,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
              x: pos.x,
              y: pos.y,
          };
          delete newItem.analysis;
          delete newItem.analysisLoading;

          newItems.push(newItem);
          currentItemsForCheck.push(newItem);
      }
      setItems(prev => [...prev, ...newItems]);
      setDuplicateCount(1); // Reset after adding
  };

  // --- Drag and Drop Handlers ---
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      const item = items.find(i => i.id === id);
      if (!item) return;

      setSelectedItemId(id);
      setDraggingId(id);

      // Calculate click offset within the item (in pixels relative to item top-left)
      const rect = (e.target as Element).closest('.draggable-item')?.getBoundingClientRect();
      if (rect) {
          setDragOffset({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
          });
      }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!draggingId || !containerRef.current) return;
      
      // We need to convert mouse movement (pixels) to sheet coordinates (inches)
      const sheetRect = containerRef.current.querySelector('.sheet-canvas')?.getBoundingClientRect();
      if (!sheetRect) return;

      const mouseX = e.clientX - sheetRect.left - dragOffset.x;
      const mouseY = e.clientY - sheetRect.top - dragOffset.y;

      let newX = mouseX / (PPI * scale);
      let newY = mouseY / (PPI * scale);

      const item = items.find(i => i.id === draggingId);
      if (item) {
          // Clamp Left/Right
          newX = Math.max(0, Math.min(newX, sheetConfig.width - item.width));
          // Clamp Top
          newY = Math.max(0, newY); 
      }

      setItems(prev => prev.map(i => {
          if (i.id === draggingId) {
              return { ...i, x: newX, y: newY };
          }
          return i;
      }));

  }, [draggingId, dragOffset, scale, sheetConfig.width, items]);

  const handleMouseUp = () => {
      setDraggingId(null);
  };
  
  const handleMouseLeave = () => {
    setDraggingId(null);
  }

  useEffect(() => {
      if (draggingId) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          window.addEventListener('mouseleave', handleMouseLeave);
      } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mouseleave', handleMouseLeave);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('mouseleave', handleMouseLeave);
      };
  }, [draggingId, handleMouseMove]);

  // --- Collision Detection Helper ---
  const checkCollision = (currentItem: ArtworkOnCanvas) => {
      return items.some(other => {
          if (other.id === currentItem.id) return false;
          return !(
              currentItem.x + currentItem.width <= other.x ||
              currentItem.x >= other.x + other.width ||
              currentItem.y + currentItem.height <= other.y ||
              currentItem.y >= other.y + other.height
          );
      });
  };

  const isSheetOverflowing = items.some(i => (i.y + i.height) > sheetConfig.height);

  const generatePreviewSheet = async (): Promise<string> => {
    const BASE_DPI = 300;
    const sheetCanvas = document.createElement('canvas');
    const sheetCtx = sheetCanvas.getContext('2d');
    if (!sheetCtx) throw new Error('Could not create canvas context');

    sheetCanvas.width = sheetConfig.width * BASE_DPI;
    sheetCanvas.height = sheetConfig.height * BASE_DPI;

    const imageCache: Record<string, HTMLImageElement> = {};
    await Promise.all(
        items.map(item =>
            new Promise<void>((resolve) => {
                if (imageCache[item.imageUrl]) return resolve();
                const img = new window.Image();
                if (!item.imageUrl.startsWith('data:')) img.crossOrigin = 'Anonymous';
                img.onload = () => { imageCache[item.imageUrl] = img; resolve(); };
                img.onerror = () => { console.warn(`Failed to load image: ${item.imageUrl}`); resolve(); };
                img.src = item.imageUrl;
            })
        )
    );

    items.forEach(item => {
        const img = imageCache[item.imageUrl];
        if (img && (item.y + item.height <= sheetConfig.height)) {
            sheetCtx.drawImage(
                img,
                item.x * BASE_DPI,
                item.y * BASE_DPI,
                item.width * BASE_DPI,
                item.height * BASE_DPI
            );
        }
    });

    return sheetCanvas.toDataURL('image/png');
  };

  const handleProcessAndAddToCart = async () => {
    setIsGenerating(true);
    try {
        const previewUrl = await generatePreviewSheet();
        
        const config = sheetConfig;
        const cartItem: CartItem = {
          id: `GNG-${Date.now()}`,
          sheetSize: {
            name: `${config.width}" x ${config.height}"`,
            width: config.width,
            height: config.height,
            price: config.price
          },
          previewUrl: previewUrl,
          artworks: items, 
          quantity: 1,
        };

        addToCart(cartItem);
        toast({
          title: "Added to Cart",
          description: `${cartItem.sheetSize.name} gang sheet.`
        });
        
        // Reset state after adding to cart
        setItems([]);
        setSelectedItemId(null);
        if (user && gangSheetDocRef) {
          setDoc(gangSheetDocRef, { items: [], selectedSizeId: selectedSizeId }, { merge: true });
        } else {
          localStorage.removeItem('guest-gang-sheet');
        }

    } catch (e) {
        console.error("Error generating sheet", e);
        toast({
            variant: "destructive",
            title: "Error Generating Sheet",
            description: "Could not generate the print file. Please try again."
        });
    } finally {
        setIsGenerating(false);
    }
  };


  if (isUserLoading || !isLoaded || isLoadingSizes) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-400">Loading your sheet...</p>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen pb-12 select-none">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Gang Sheet Builder</h1>
          <p className="mt-2 text-zinc-400">Upload designs and drag them to arrange.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* 1. Sheet Selection */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs mr-2">1</span>
                    Select Sheet Size
                  </h3>
                  {user && (
                    <div className="flex items-center text-xs text-zinc-500">
                        <Save className="w-3 h-3 mr-1.5 text-accent" />
                        <span>Auto-saved to cloud</span>
                    </div>
                  )}
              </div>
              <div className="space-y-3">
                {sheetSizes?.map((config) => (
                  <label key={config.id} className={`relative overflow-hidden flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedSizeId === config.id ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
                    <div className="flex items-center relative z-10">
                      <input
                        type="radio"
                        name="sheetSize"
                        value={config.id}
                        checked={selectedSizeId === config.id}
                        onChange={(e) => setSelectedSizeId(e.target.value)}
                        className="h-4 w-4 text-primary focus:ring-primary border-zinc-600 bg-zinc-800"
                      />
                      <span className="ml-3 font-medium text-gray-200">{config.width}" x {config.height}"</span>
                    </div>
                    <span className="font-bold text-accent relative z-10">${config.price.toFixed(2)}</span>
                    {selectedSizeId === config.id && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />}
                  </label>
                ))}
              </div>
            </div>

            {selectedItem && (
                 <div className="glass-panel rounded-2xl p-6 space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Selected Artwork</h3>
                        <button onClick={() => setSelectedItemId(null)} className="text-zinc-500 hover:text-white">&times;</button>
                     </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 flex items-center">
                                <ArrowLeftRight className="w-3 h-3 mr-1" /> Width
                            </label>
                            <div className="relative">
                                <input 
                                  type="number" 
                                  step="0.1"
                                  min="0.1"
                                  value={selectedItem.width}
                                  onChange={(e) => {
                                     const w = parseFloat(e.target.value);
                                     if (!isNaN(w) && w > 0) {
                                         const ratio = selectedItem.canvasHeight / selectedItem.canvasWidth;
                                         updateItem(selectedItem.id, { width: w, height: parseFloat((w * ratio).toFixed(2)) });
                                     }
                                  }}
                                  className="block w-full rounded bg-zinc-900 border border-white/10 text-white text-xs p-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                />
                                <span className="absolute right-2 top-1.5 text-zinc-600 text-[10px]">in</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 flex items-center">
                                <ArrowUpDown className="w-3 h-3 mr-1" /> Height
                            </label>
                            <div className="relative">
                                <input 
                                  type="number" 
                                  value={selectedItem.height}
                                  readOnly
                                  className="block w-full rounded bg-zinc-900/50 border border-white/5 text-zinc-500 text-xs p-1.5 cursor-not-allowed outline-none"
                                />
                                <span className="absolute right-2 top-1.5 text-zinc-600 text-[10px]">in</span>
                            </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center bg-black/20 p-2 rounded text-xs font-mono text-zinc-500">
                          <span className="flex items-center"><Move className="w-3 h-3 mr-1" /> Position</span>
                          <span>X: {selectedItem.x.toFixed(2)}" Y: {selectedItem.y.toFixed(2)}"</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                           <label className="text-xs text-zinc-400 font-medium">Duplicate:</label>
                           <div className="flex items-center space-x-2">
                               <div className="flex items-center">
                                    <button 
                                        onClick={() => setDuplicateCount(Math.max(1, duplicateCount - 1))}
                                        className="w-8 h-8 flex items-center justify-center bg-zinc-800 border border-white/10 rounded-l hover:bg-zinc-700 text-zinc-400 transition-colors"
                                    >
                                        -
                                    </button>
                                    <input 
                                        type="number" 
                                        value={duplicateCount}
                                        onChange={(e) => setDuplicateCount(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-12 h-8 bg-zinc-900 border-y border-white/10 text-center text-sm text-white focus:outline-none"
                                    />
                                    <button 
                                        onClick={() => setDuplicateCount(duplicateCount + 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-zinc-800 border border-white/10 rounded-r hover:bg-zinc-700 text-zinc-400 transition-colors"
                                    >
                                        +
                                    </button>
                               </div>
                               <button 
                                    onClick={() => handleBulkDuplicate(selectedItem, duplicateCount)}
                                    className="h-8 px-3 bg-white text-black text-xs font-bold rounded hover:bg-zinc-200 transition-colors flex items-center"
                               >
                                    <Copy className="w-3 h-3 mr-1" /> Add
                               </button>
                           </div>
                      </div>
                      <AiAnalysisPanel artwork={selectedItem} onAnalyze={handleRunAnalysis} isLoggedIn={!!user} />
                 </div>
            )}

            {/* 2. Upload & Item List */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs mr-2">2</span>
                     Designs
                  </h3>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs flex items-center bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                  >
                      <Plus className="w-3 h-3 mr-1" /> Add New
                  </button>
              </div>
              
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />

              {items.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-600 rounded-xl p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                     <Upload className="h-6 w-6 text-zinc-400 group-hover:text-primary" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">Upload Artwork</p>
                  <p className="text-xs text-zinc-500">PNG, AI, PDF (300 DPI)</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 builder-scroll">
                  {items.map((item, index) => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedItemId === item.id ? 'bg-zinc-800 border-primary ring-1 ring-primary/20' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800'}`}
                      >
                          <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 rounded border border-white/10 overflow-hidden bg-checkerboard-dark flex-shrink-0">
                                      {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-full h-full object-contain" alt={item.name} />
                                      ): (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">No img</div>
                                      )}
                                  </div>
                                  <div className="min-w-0">
                                      <p className="text-sm font-medium text-white truncate w-24" title={item.name}>{item.name}</p>
                                      <p className="text-xs text-zinc-500">{item.width}" x {item.height}"</p>
                                  </div>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
                disabled={items.length === 0 || isSheetOverflowing || isGenerating || !isLoaded}
                onClick={handleProcessAndAddToCart}
                className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-xl text-black bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all transform hover:-translate-y-0.5"
            >
                {isGenerating ? 'Generating...' : `Add to Cart - $${sheetConfig.price.toFixed(2)}`}
                {!isGenerating && <ArrowRight className="ml-2 w-5 h-5" />}
            </button>
          </div>

          {/* Right Preview */}
          <div ref={containerRef} className="lg:col-span-2 glass-panel rounded-2xl border border-white/10 p-8 flex flex-col items-center relative overflow-hidden">
            <div className="flex justify-between w-full max-w-2xl mb-4 z-10">
                <span className="text-zinc-400 font-medium text-sm flex items-center">
                    <Info className="w-4 h-4 mr-1 text-zinc-500" />
                    Preview Scale: {(scale * 100).toFixed(0)}%
                </span>
                {isSheetOverflowing && (
                    <span className="text-red-400 font-bold text-sm flex items-center animate-pulse">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Items outside print area!
                    </span>
                )}
            </div>

            {/* The Sheet Canvas */}
            <div 
                className="relative builder-scroll overflow-auto max-h-[80vh] w-full flex justify-center"
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
            >
                 <div 
                    className="relative bg-checkerboard-dark sheet-canvas shadow-2xl bg-zinc-950 border border-white/10 rounded-sm"
                    style={{
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                        transition: 'height 0.3s ease'
                    }}
                    onMouseDown={() => setSelectedItemId(null)} // Deselect if clicking background
                 >
                    {items.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        const isColliding = checkCollision(item);
                        const isOutOfBounds = (item.y + item.height) > sheetConfig.height || (item.x + item.width) > sheetConfig.width;

                        return (
                            <div
                                key={item.id}
                                className={`absolute draggable-item cursor-move group ${
                                    isSelected ? 'z-50' : 'z-10'
                                }`}
                                style={{
                                    left: `${item.x * PPI * scale}px`,
                                    top: `${item.y * PPI * scale}px`,
                                    width: `${item.width * PPI * scale}px`,
                                    height: `${item.height * PPI * scale}px`,
                                }}
                                onMouseDown={(e) => handleMouseDown(e, item.id)}
                            >
                                {/* Image Container */}
                                <div className={`w-full h-full relative ${
                                    isColliding || isOutOfBounds ? 'border-2 border-red-500 bg-red-500/20' : 
                                    isSelected ? 'border-2 border-primary bg-primary/5' : 
                                    'border border-blue-400/30 hover:border-blue-400'
                                }`}>
                                    {item.imageUrl ? (
                                      <img 
                                          src={item.imageUrl} 
                                          className="w-full h-full object-contain pointer-events-none" 
                                          alt=""
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-zinc-800/50 flex items-center justify-center text-white text-xs font-mono p-1">Re-upload required</div>
                                    )}
                                    
                                    {/* Warnings */}
                                    {(isColliding || isOutOfBounds) && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl">
                                            <AlertTriangle className="w-3 h-3" />
                                        </div>
                                    )}

                                    {/* Resize Handles (Visual Only for now) */}
                                    {isSelected && (
                                        <>
                                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-primary"></div>
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-primary"></div>
                                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-primary"></div>
                                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-primary"></div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                 </div>
            </div>
            <div className="w-full flex justify-between text-zinc-500 text-xs mt-2 font-mono">
                <span>0"</span>
                <span>{sheetConfig.width}"</span>
            </div>
            
            <div className="mt-4 text-xs text-zinc-500 flex items-center">
                <Move className="w-4 h-4 mr-2" />
                Click and drag images to arrange. Overlapping items will be highlighted red.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
