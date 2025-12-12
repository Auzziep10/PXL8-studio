
'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GangSheetItem, CartItem, ArtworkOnCanvas, Artwork, SheetSize as SheetType, SheetCartItem, ServiceAddOn } from '@/lib/types';
import { PPI } from '@/lib/constants';
import { Upload, Trash2, AlertTriangle, Wand2, Info, ArrowRight, Plus, Copy, Move, ArrowLeftRight, ArrowUpDown, Save, QrCode, Droplet, RotateCw, X, Percent, ChevronDown, Undo } from 'lucide-react';
import { analyzeArtwork } from '@/app/actions';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import AiAnalysisPanel from './ai-analysis-panel';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { Button } from './ui/button';
import { uploadFileAndGetURL } from '@/firebase/storage';
import QRCode from 'qrcode';
import { formatCurrency, sanitizeFilename } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { cn } from '@/lib/utils';


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


export default function GangSheetBuilder({ usage, newArtworks, onArtworkHandled }: { usage: 'Builder', newArtworks?: Omit<Artwork, 'id'>[], onArtworkHandled?: (name: string) => void }) {
  const { addItem: addToCart } = useCart();
  const { toast } = useToast();
  const [items, setItems] = useState<ArtworkOnCanvas[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  // --- New State for Magic Wand Tool ---
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemovalTolerance, setBgRemovalTolerance] = useState(20);

  const sheetSizesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'sheetSizes'), where('usage', '==', usage)) : null),
    [firestore, usage]
  );
  const { data: sheetSizes, isLoading: isLoadingSizes } = useCollection<SheetType & {id: string}>(sheetSizesQuery);

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
  
  const sortedSheetSizes = useMemo(() => {
    if (!sheetSizes) return [];
    return [...sheetSizes].sort((a, b) => (a.width * a.height) - (b.width * b.height));
  }, [sheetSizes]);


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
    if (!selectedSizeId && sortedSheetSizes && sortedSheetSizes.length > 0) {
      setSelectedSizeId(sortedSheetSizes[0].id); 
    }
  }, [sortedSheetSizes, selectedSizeId]);



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
            const { analysis, imageUrl, history, ...rest } = item;
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
            // Create and emit a detailed error for better debugging
            const permissionError = new FirestorePermissionError({
                path: gangSheetDocRef.path,
                operation: 'write',
                requestResourceData: storableSheetData,
            });
            errorEmitter.emit('permission-error', permissionError);
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

  // Resizing State
  type ResizingState = {
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  } | null;
  const [resizingState, setResizingState] = useState<ResizingState>(null);

  // Rotating State
  type RotatingState = {
    itemCenterX: number;
    itemCenterY: number;
    startAngle: number;
    initialRotation: number;
  } | null;
  const [rotatingState, setRotatingState] = useState<RotatingState>(null);

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [isGenerating, setIsGenerating] = useState(false);

  const sheetConfig = sortedSheetSizes?.find(s => s.id === selectedSizeId);
  
  const calculateFinalPrice = useCallback((config: SheetType): number => {
    if (pricePerSqInch === null) return 0;
    const basePrice = config.width * config.height * pricePerSqInch;
    const discountAmount = basePrice * ((config.discount || 0) / 100);
    return basePrice - discountAmount;
  }, [pricePerSqInch]);

  const selectedSheetPrice = useMemo(() => {
    if (sheetConfig && pricePerSqInch !== null) {
      return calculateFinalPrice(sheetConfig);
    }
    return 0;
  }, [sheetConfig, pricePerSqInch, calculateFinalPrice]);


  const selectedItem = items.find(item => item.id === selectedItemId);

  // --- Auto-Scaling for Preview ---
  useEffect(() => {
    const handleResize = () => {
        if (!containerRef.current || !sheetConfig) return;
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
  }, [selectedSizeId, sheetConfig]); 

  const displayWidth = (sheetConfig?.width || 0) * PPI * scale;
  const displayHeight = (sheetConfig?.height || 0) * PPI * scale;

  // --- Auto-Positioning Algorithm ---
  const findOpenPosition = (width: number, height: number, existingItems: ArtworkOnCanvas[]): {x: number, y: number} => {
    if (!sheetConfig) return { x: 0, y: 0 };
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

  const handleImageLoad = useCallback((imageUrl: string, fileName: string, isFromUpload: boolean, existingArtwork?: Omit<Artwork, 'id'>) => {
    const isPermanent = !imageUrl.startsWith('data:');
    
    const placeImageOnCanvas = (url: string) => {
        const img = new window.Image();
        if (!url.startsWith('data:')) {
            img.crossOrigin = 'Anonymous';
        }

        img.onload = () => {
            let w, h, dpi;
            if (existingArtwork) {
                w = existingArtwork.width;
                h = existingArtwork.height;
                dpi = existingArtwork.dpi;
            } else {
                dpi = 300;
                w = parseFloat((img.width / dpi).toFixed(2));
                h = parseFloat((img.height / dpi).toFixed(2));
            }

            const pos = findOpenPosition(w, h, items);

            const newItem: ArtworkOnCanvas = {
                id: `art-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: fileName,
                imageUrl: url,
                width: w,
                height: h,
                quantity: 1,
                dpi: dpi,
                x: pos.x,
                y: pos.y,
                rotation: 0,
                canvasWidth: w * PPI,
                canvasHeight: h * PPI,
                history: [url],
            };

            setItems(prev => [...prev, newItem]);
            setSelectedItemId(newItem.id);
            setDuplicateCount(1);
            
            if (isFromUpload) {
                toast({ title: 'Upload complete!', description: 'Your artwork has been added to the sheet.' });
            }
        };

        img.onerror = () => {
            toast({ variant: 'destructive', title: 'Image Load Failed', description: 'Could not load the image to place it on the canvas.' });
        };
        img.src = url;
    };

    if (user && !isPermanent) {
        // Logged-in user with a temporary data URL
        toast({ title: 'Saving AI Design...', description: 'Uploading to your secure storage in the background.' });
        placeImageOnCanvas(imageUrl); // Place immediately for UX

        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], sanitizeFilename(fileName), { type: blob.type || 'image/png' });
            return uploadFileAndGetURL(file, user.uid);
          })
          .then(permanentUrl => {
            // Silently update the item with the permanent URL
            setItems(prev =>
              prev.map(item =>
                item.imageUrl === imageUrl ? { ...item, imageUrl: permanentUrl, history: [permanentUrl] } : item
              )
            );
          })
          .catch(err => {
            toast({
              variant: 'destructive',
              title: 'Save Failed',
              description: 'Could not save AI design. It will remain on your sheet temporarily.',
            });
          });
    } else {
        // Guest user, or already have a permanent URL
        placeImageOnCanvas(imageUrl);
    }
  }, [items, sheetConfig, toast, user]);


   // Effect to handle new artworks passed as props
    useEffect(() => {
        if (newArtworks && newArtworks.length > 0 && onArtworkHandled) {
            newArtworks.forEach(art => {
                handleImageLoad(art.imageUrl, art.name, false, art);
                onArtworkHandled(art.name); // Notify parent that this artwork has been processed
            });
        }
    }, [newArtworks, onArtworkHandled, handleImageLoad]);

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
            handleImageLoad(permanentUrl, file.name, true);
        } catch (error) {
            console.error("File upload failed:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload your image. Please try again.' });
        }
    } else {
        // Guest user: use local data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const localUrl = e.target?.result as string;
            handleImageLoad(localUrl, file.name, true);
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

  // --- Background Removal ---
  const handleCanvasClickForBgRemoval = async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isRemovingBg || !selectedItem) return;
  
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!tempCtx) return;
  
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = async () => {
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          tempCtx.drawImage(img, 0, 0);
  
          // Get the color at the clicked pixel, scaled to the original image size
          const clickedPixelX = Math.floor(x * (img.width / canvas.offsetWidth));
          const clickedPixelY = Math.floor(y * (img.height / canvas.offsetHeight));
          const pixelData = tempCtx.getImageData(clickedPixelX, clickedPixelY, 1, 1).data;
          
          if (pixelData[3] === 0) {
              toast({ title: "Already Transparent", description: "You clicked on a transparent area." });
              return;
          }
  
          const [r, g, b] = pixelData;
  
          // Perform the color removal
          const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          
          for (let i = 0; i < data.length; i += 4) {
              const diff = Math.sqrt(
                  Math.pow(data[i] - r, 2) +
                  Math.pow(data[i + 1] - g, 2) +
                  Math.pow(data[i + 2] - b, 2)
              );
              if (diff < bgRemovalTolerance) {
                  data[i + 3] = 0; // Set alpha to 0
              }
          }
          tempCtx.putImageData(imageData, 0, 0);
  
          const newDataUrl = tempCanvas.toDataURL('image/png');
  
          // Update the item
          if (user) {
              toast({ title: "Processing...", description: "Uploading new version of the artwork." });
              const blob = await (await fetch(newDataUrl)).blob();
              const file = new File([blob], sanitizeFilename(selectedItem.name), { type: 'image/png' });
              const permanentUrl = await uploadFileAndGetURL(file, user.uid);
              updateItem(selectedItem.id, { 
                  imageUrl: permanentUrl, 
                  history: [...(selectedItem.history || [selectedItem.imageUrl]), permanentUrl] 
              });
          } else {
              updateItem(selectedItem.id, { 
                  imageUrl: newDataUrl, 
                  history: [...(selectedItem.history || [selectedItem.imageUrl]), newDataUrl] 
              });
          }
  
          toast({ title: 'Color Removed!', description: 'The selected color has been made transparent.' });
      };
      img.src = selectedItem.imageUrl;
  };

  const handleUndo = () => {
    if (!selectedItem || !selectedItem.history || selectedItem.history.length <= 1) return;
    
    const newHistory = [...selectedItem.history];
    newHistory.pop(); // Remove current state
    const previousUrl = newHistory[newHistory.length - 1]; // Get the new last state

    updateItem(selectedItem.id, { imageUrl: previousUrl, history: newHistory });
  };


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
          
          const newItem: Omit<ArtworkOnCanvas, 'analysis' | 'analysisLoading' | 'history'> & { analysis?: any, history?: string[] } = {
              ...itemToClone,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
              x: pos.x,
              y: pos.y,
              history: [itemToClone.imageUrl]
          };
          delete newItem.analysis;
          delete newItem.analysisLoading;

          newItems.push(newItem as ArtworkOnCanvas);
          currentItemsForCheck.push(newItem as ArtworkOnCanvas);
      }
      setItems(prev => [...prev, ...newItems]);
      setDuplicateCount(1); // Reset after adding
  };

  // --- Drag, Resize, Rotate Handlers ---
  const handleMouseDownOnItem = (e: React.MouseEvent, id: string) => {
      if (isRemovingBg) return; // Prevent moving items while in BG removal mode
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

    const getRotatedBoundingBox = (item: ArtworkOnCanvas) => {
        const rad = (item.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const w = item.width;
        const h = item.height;
        const cx = item.x + w / 2;
        const cy = item.y + h / 2;

        const corners = [
            { x: -w / 2, y: -h / 2 },
            { x: w / 2, y: -h / 2 },
            { x: w / 2, y: h / 2 },
            { x: -w / 2, y: h / 2 },
        ];

        const rotatedCorners = corners.map(corner => ({
            x: cx + corner.x * cos - corner.y * sin,
            y: cy + corner.x * sin + corner.y * cos,
        }));
        
        return {
            minX: Math.min(...rotatedCorners.map(c => c.x)),
            maxX: Math.max(...rotatedCorners.map(c => c.x)),
            minY: Math.min(...rotatedCorners.map(c => c.y)),
            maxY: Math.max(...rotatedCorners.map(c => c.y)),
        };
    };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!sheetConfig) return;
      if (rotatingState && draggingId && containerRef.current) {
          const sheetRect = containerRef.current.querySelector('.sheet-canvas')?.getBoundingClientRect();
          if (!sheetRect) return;

          const dx = e.clientX - rotatingState.itemCenterX;
          const dy = e.clientY - rotatingState.itemCenterY;
          const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
          const angleDelta = currentAngle - rotatingState.startAngle;

          let newRotation = rotatingState.initialRotation + angleDelta;
          
          if (e.shiftKey) {
              newRotation = Math.round(newRotation / 45) * 45;
          }

          updateItem(draggingId, { rotation: newRotation });
          return;
      }

      if (resizingState && draggingId) {
          const dx = (e.clientX - resizingState.initialX) / scale;
          const newWidth = (resizingState.initialWidth * PPI + dx) / PPI;
          
          const item = items.find(i => i.id === draggingId);
          if (item && newWidth > 0.5) { // Minimum width 0.5 inch
              const ratio = item.canvasHeight / item.canvasWidth;
              const newHeight = newWidth * ratio;
              updateItem(draggingId, { width: parseFloat(newWidth.toFixed(2)), height: parseFloat(newHeight.toFixed(2))});
          }
          return;
      }
      
      if (!draggingId || !containerRef.current) return;
      
      const sheetRect = containerRef.current.querySelector('.sheet-canvas')?.getBoundingClientRect();
      if (!sheetRect) return;

      const item = items.find(i => i.id === draggingId);
      if (!item) return;

      const mouseXOnSheet = e.clientX - sheetRect.left;
      const mouseYOnSheet = e.clientY - sheetRect.top;

      const dragOffsetXInSheet = dragOffset.x;
      const dragOffsetYInSheet = dragOffset.y;

      // Proposed top-left in sheet pixels
      const sheetPixelX = mouseXOnSheet - dragOffsetXInSheet;
      const sheetPixelY = mouseYOnSheet - dragOffsetYInSheet;

      // Convert to inches
      let newX = sheetPixelX / (PPI * scale);
      let newY = sheetPixelY / (PPI * scale);

      // Get the bounding box of the rotated item at the new potential position
      const tempItem = { ...item, x: newX, y: newY };
      const bbox = getRotatedBoundingBox(tempItem);

      // Adjust newX and newY if the bounding box is out of bounds
      if (bbox.minX < 0) newX -= bbox.minX;
      if (bbox.maxX > sheetConfig.width) newX -= (bbox.maxX - sheetConfig.width);
      if (bbox.minY < 0) newY -= bbox.minY;
      if (bbox.maxY > sheetConfig.height) newY -= (bbox.maxY - sheetConfig.height);

      setItems(prev => prev.map(i => i.id === draggingId ? { ...i, x: newX, y: newY } : i));

  }, [draggingId, dragOffset, scale, sheetConfig, items, resizingState, rotatingState]);

  const handleMouseUp = () => {
      setDraggingId(null);
      setResizingState(null);
      setRotatingState(null);
  };
  
  const handleMouseLeave = () => {
    setDraggingId(null);
    setResizingState(null);
    setRotatingState(null);
  }

  const handleMouseDownOnResizeHandle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = items.find(i => i.id === id);
    if (!item) return;

    setDraggingId(id); // Use draggingId to indicate an action is happening
    setResizingState({
        initialX: e.clientX,
        initialY: e.clientY,
        initialWidth: item.width,
        initialHeight: item.height,
    });
  };

  const handleMouseDownOnRotateHandle = (e: React.MouseEvent, id: string, itemRef: HTMLDivElement) => {
      e.stopPropagation();
      const item = items.find(i => i.id === id);
      if (!item || !itemRef) return;
      
      const rect = itemRef.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const startAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      setDraggingId(id); // Indicate action is happening
      setRotatingState({
          itemCenterX: centerX,
          itemCenterY: centerY,
          startAngle: startAngle,
          initialRotation: item.rotation || 0,
      });
  };


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
      // Simplified collision check for rotated items is complex.
      // For now, we'll use bounding box which isn't perfect for rotated rectangles.
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

  const isSheetOverflowing = items.some(i => {
    if (!sheetConfig) return false;
    const bbox = getRotatedBoundingBox(i);
    return bbox.maxY > sheetConfig.height;
  });

  const generatePreviewSheet = async (): Promise<string> => {
    if (!sheetConfig) throw new Error("Sheet size not configured");
    const BASE_DPI = 300;
    const sheetCanvas = document.createElement('canvas');
    const sheetCtx = sheetCanvas.getContext('2d');
    if (!sheetCtx) throw new Error('Could not create canvas context');

    sheetCanvas.width = sheetConfig.width * BASE_DPI;
    sheetCanvas.height = sheetConfig.height * BASE_DPI;

    const imageCache: Record<string, HTMLImageElement> = {};
    await Promise.all(
        items.map(item =>
            new Promise<void>((resolve, reject) => {
                if (imageCache[item.imageUrl]) return resolve();
                const img = new window.Image();
                if (!item.imageUrl.startsWith('data:')) img.crossOrigin = 'Anonymous';
                img.onload = () => { imageCache[item.imageUrl] = img; resolve(); };
                img.onerror = () => { console.error(`Failed to load image: ${item.imageUrl}`); reject(new Error(`Failed to load image for sheet generation.`)); };
                img.src = item.imageUrl;
            })
        )
    );

    items.forEach(item => {
        const img = imageCache[item.imageUrl];
        if (img && !isSheetOverflowing) {
            const centerX = (item.x + item.width / 2) * BASE_DPI;
            const centerY = (item.y + item.height / 2) * BASE_DPI;

            sheetCtx.save();
            sheetCtx.translate(centerX, centerY);
            sheetCtx.rotate((item.rotation || 0) * Math.PI / 180);
            sheetCtx.translate(-centerX, -centerY);
            
            sheetCtx.drawImage(
                img,
                item.x * BASE_DPI,
                item.y * BASE_DPI,
                item.width * BASE_DPI,
                item.height * BASE_DPI
            );

            sheetCtx.restore();
        }
    });

    return sheetCanvas.toDataURL('image/png');
  };

  const handleProcessAndAddToCart = async () => {
    if (!sheetConfig) {
      toast({
        variant: "destructive",
        title: "No Sheet Size Selected",
        description: "Please select a sheet size before adding to cart."
      });
      return;
    }
    setIsGenerating(true);
    try {
        let finalItems = [...items];

        // Check for temporary images and upload them if the user is logged in
        if (user) {
            const itemsToUpload = items.filter(item => item.imageUrl.startsWith('data:'));
            if (itemsToUpload.length > 0) {
                toast({ title: 'Saving Artwork', description: 'Uploading AI-generated designs to your account...' });
                const uploadPromises = itemsToUpload.map(async item => {
                    const blob = await (await fetch(item.imageUrl)).blob();
                    const file = new File([blob], sanitizeFilename(item.name), { type: 'image/png' });
                    const permanentUrl = await uploadFileAndGetURL(file, user.uid);
                    return { itemId: item.id, newUrl: permanentUrl };
                });

                const uploadedUrls = await Promise.all(uploadPromises);
                
                finalItems = items.map(item => {
                    const uploaded = uploadedUrls.find(u => u.itemId === item.id);
                    return uploaded ? { ...item, imageUrl: uploaded.newUrl } : item;
                });
                
                // Update the state so the new URLs are saved to the draft
                setItems(finalItems);
            }
        } else if (items.some(item => item.imageUrl.startsWith('data:'))) {
            toast({
                variant: "destructive",
                title: "Login Required",
                description: "Please log in to save and checkout AI-generated designs."
            });
            setIsGenerating(false);
            return;
        }

        const previewDataUrl = await generatePreviewSheet();
        
        const config = sheetConfig as SheetType & { id: string };
        const cartItem: SheetCartItem = {
          id: `GNG-${Date.now()}`,
          type: 'sheet',
          sheetSize: {
            name: `${config.width}" x ${config.height}"`,
            width: config.width,
            height: config.height,
            price: selectedSheetPrice,
            discount: config.discount,
          },
          previewUrl: previewDataUrl,
          artworks: finalItems, 
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
            description: (e as Error).message || "Could not generate the print file. Please try again."
        });
    } finally {
        setIsGenerating(false);
    }
  };


  if (isUserLoading || !isLoaded || isLoadingSizes || isLoadingPrice) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground">Loading your sheet...</p>
            </div>
        </div>
    )
  }
  
  return (
    <div className="min-h-screen pb-12 select-none">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {usage === 'Builder' && (
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Gang Sheet Builder</h1>
                <p className="mt-2 text-muted-foreground">Upload designs and drag them to arrange.</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Controls */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex-grow space-y-4">
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full glass-panel rounded-2xl px-6">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-lg font-semibold text-foreground">
                             <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs mr-2">1</span>
                             Select Sheet Size
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                             <div className="space-y-3">
                                {(isLoadingSizes || isLoadingPrice) ? (
                                    <p className="text-muted-foreground text-sm">Loading pricing...</p>
                                ) : sortedSheetSizes?.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No pricing tiers available for "{usage}". Please configure them in the admin pricing manager.</p>
                                ) : sortedSheetSizes?.map((config) => {
                                    const finalPrice = calculateFinalPrice(config);
                                    return (
                                        <label key={config.id} className={`relative overflow-hidden flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedSizeId === config.id ? 'border-primary bg-primary/10' : 'border-border hover:border-muted'}`}>
                                            <div className="flex items-center relative z-10">
                                            <input
                                                type="radio"
                                                name="sheetSize"
                                                value={config.id}
                                                checked={selectedSizeId === config.id}
                                                onChange={(e) => setSelectedSizeId(e.target.value)}
                                                className="h-4 w-4 text-primary focus:ring-primary border-muted-foreground"
                                            />
                                            <span className="ml-3 font-medium text-foreground">{config.name} - {config.width}" x {config.height}"</span>
                                            </div>
                                            <div className="flex flex-col items-end relative z-10">
                                                <span className="font-bold text-accent">{formatCurrency(finalPrice)}</span>
                                                {config.discount > 0 && 
                                                    <span className="text-xs text-red-500 flex items-center gap-1">
                                                        <Percent className="w-3 h-3" /> {config.discount}% Off
                                                    </span>
                                                }
                                            </div>
                                            {selectedSizeId === config.id && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />}
                                        </label>
                                    )
                                })}
                              </div>
                        </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-2">
                        <AccordionTrigger className="text-lg font-semibold text-foreground">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs mr-2">2</span>
                             Designs ({items.length})
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                              <Button onClick={() => fileInputRef.current?.click()} className="w-full mb-4">
                                  <Plus className="w-4 h-4 mr-2" /> Add New Design
                              </Button>
                              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,image/svg+xml" onChange={handleFileUpload} />
                              {items.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-4">No designs uploaded.</p>
                              ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 builder-scroll">
                                  {items.map((item) => (
                                      <div 
                                        key={item.id} 
                                        onClick={() => setSelectedItemId(item.id)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedItemId === item.id ? 'bg-secondary border-primary ring-1 ring-primary/20' : 'bg-background/50 border-border hover:bg-secondary'}`}
                                      >
                                          <div className="flex items-start justify-between">
                                              <div className="flex items-center space-x-3">
                                                  <div className="w-12 h-12 rounded border border-border overflow-hidden bg-checkerboard-dark flex-shrink-0">
                                                      {item.imageUrl ? (
                                                        <img src={item.imageUrl} className="w-full h-full object-contain" alt={item.name} />
                                                      ): (
                                                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No img</div>
                                                      )}
                                                  </div>
                                                  <div className="min-w-0">
                                                      <p className="text-sm font-medium text-foreground truncate w-24" title={item.name}>{item.name}</p>
                                                      <p className="text-xs text-muted-foreground">{item.width}" x {item.height}"</p>
                                                  </div>
                                              </div>
                                              <div className="flex items-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleBulkDuplicate(item, 1); }}
                                                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                                                    title="Duplicate Artwork"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                    title="Remove Artwork"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                                </div>
                              )}
                        </AccordionContent>
                    </AccordionItem>
                    {selectedItem && (
                         <AccordionItem value="item-3">
                            <AccordionTrigger className="text-lg font-semibold text-foreground">
                                <Wand2 className="w-5 h-5 mr-2 text-primary" />
                                 Selected Artwork
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 flex items-center">
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
                                                className="block w-full rounded bg-background border border-input text-foreground text-xs p-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                                />
                                                <span className="absolute right-2 top-1.5 text-muted-foreground text-[10px]">in</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1 flex items-center">
                                                <ArrowUpDown className="w-3 h-3 mr-1" /> Height
                                            </label>
                                            <div className="relative">
                                                <input 
                                                type="number" 
                                                value={selectedItem.height}
                                                readOnly
                                                className="block w-full rounded bg-muted border border-border text-muted-foreground text-xs p-1.5 cursor-not-allowed outline-none"
                                                />
                                                <span className="absolute right-2 top-1.5 text-muted-foreground text-[10px]">in</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-background/50 p-2 rounded text-xs font-mono text-muted-foreground">
                                        <span className="flex items-center"><Move className="w-3 h-3 mr-1" /> Position</span>
                                        <span>X: {selectedItem.x.toFixed(2)}" Y: {selectedItem.y.toFixed(2)}"</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                        <label className="text-xs text-muted-foreground font-medium">Duplicate:</label>
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center">
                                                    <button 
                                                        onClick={() => setDuplicateCount(Math.max(1, duplicateCount - 1))}
                                                        className="w-8 h-8 flex items-center justify-center bg-secondary border border-border rounded-l hover:bg-muted text-muted-foreground transition-colors"
                                                    >
                                                        -
                                                    </button>
                                                    <input 
                                                        type="number" 
                                                        value={duplicateCount}
                                                        onChange={(e) => setDuplicateCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-12 h-8 bg-background border-y border-border text-center text-sm text-foreground focus:outline-none"
                                                    />
                                                    <button 
                                                        onClick={()=> setDuplicateCount(duplicateCount + 1)}
                                                        className="w-8 h-8 flex items-center justify-center bg-secondary border border-border rounded-r hover:bg-muted text-muted-foreground transition-colors"
                                                    >
                                                        +
                                                    </button>
                                            </div>
                                            <button 
                                                    onClick={() => handleBulkDuplicate(selectedItem, duplicateCount)}
                                                    className="h-8 px-3 bg-primary text-primary-foreground text-xs font-bold rounded hover:bg-primary/90 transition-colors flex items-center"
                                            >
                                                    <Copy className="w-3 h-3 mr-1" /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* New Magic Wand Tool */}
                                    <div className="space-y-3 pt-4 border-t border-border">
                                        <div className="flex items-center gap-2">
                                            <Button variant={isRemovingBg ? "destructive" : "outline"} onClick={() => setIsRemovingBg(!isRemovingBg)}>
                                                <Droplet className="w-4 h-4 mr-2" />
                                                {isRemovingBg ? 'Cancel' : 'Magic Wand Tool'}
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={handleUndo} 
                                                disabled={!selectedItem.history || selectedItem.history.length <= 1}
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
                                    
                                    <AiAnalysisPanel artwork={selectedItem} onAnalyze={handleRunAnalysis} isLoggedIn={!!user} />
                                </div>
                            </AccordionContent>
                         </AccordionItem>
                    )}
                </Accordion>
            </div>
            
            <div className="glass-panel p-4 rounded-2xl mt-auto sticky bottom-4">
                 <button
                    disabled={items.length === 0 || isSheetOverflowing || isGenerating || !isLoaded}
                    onClick={handleProcessAndAddToCart}
                    className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-xl text-black bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all transform hover:-translate-y-0.5"
                >
                    {isGenerating ? 'Generating...' : `Add to Cart - ${formatCurrency(selectedSheetPrice)}`}
                    {!isGenerating && <ArrowRight className="ml-2 w-5 h-5" />}
                </button>
            </div>
          </div>

          {/* Right Preview */}
          <div ref={containerRef} className="lg:col-span-2 glass-panel rounded-2xl border border-border p-8 flex flex-col items-center relative overflow-hidden">
            <div className="flex justify-between w-full max-w-2xl mb-4 z-10">
                <span className="text-muted-foreground font-medium text-sm flex items-center">
                    <Info className="w-4 h-4 mr-1 text-muted-foreground" />
                    Preview Scale: {(scale * 100).toFixed(0)}%
                </span>
                {isSheetOverflowing && (
                    <span className="text-red-500 font-bold text-sm flex items-center animate-pulse">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Items outside print area!
                    </span>
                )}
            </div>

            {/* The Sheet Canvas */}
            <div 
                className={`relative builder-scroll overflow-auto max-h-[80vh] w-full flex justify-center`}
            >
                 <div 
                    className={cn(
                        `relative checkerboard sheet-canvas shadow-2xl`,
                        isRemovingBg && selectedItem && 'cursor-eyedropper'
                    )}
                    style={{
                        width: `${displayWidth}px`,
                        height: `${displayHeight}px`,
                        transition: 'height 0.3s ease'
                    }}
                    onMouseDown={() => { if(!isRemovingBg) setSelectedItemId(null); }} // Deselect if clicking background
                 >
                    {items.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        
                        const itemBBox = getRotatedBoundingBox(item);
                        const isOutOfBounds = sheetConfig ? (itemBBox.minX < 0 || itemBBox.maxX > sheetConfig.width || itemBBox.minY < 0 || itemBBox.maxY > sheetConfig.height) : false;

                        const isColliding = items.some(other => {
                            if (other.id === item.id) return false;
                            const thisBBox = itemBBox;
                            const otherBBox = getRotatedBoundingBox(other);

                            return !(thisBBox.maxX <= otherBBox.minX || thisBBox.minX >= otherBBox.maxX || thisBBox.maxY <= otherBBox.minY || thisBBox.minY >= otherBBox.maxY);
                        });
                        
                        const itemRef = React.createRef<HTMLDivElement>();

                        return (
                            <div
                                key={item.id}
                                ref={itemRef}
                                className={`absolute draggable-item group ${isRemovingBg ? '' : 'cursor-move'}`}
                                style={{
                                    left: `${item.x * PPI * scale}px`,
                                    top: `${item.y * PPI * scale}px`,
                                    width: `${item.width * PPI * scale}px`,
                                    height: `${item.height * PPI * scale}px`,
                                    transformOrigin: 'center center',
                                    transform: `rotate(${item.rotation || 0}deg)`,
                                    zIndex: isSelected ? 50 : 10,
                                }}
                                onMouseDown={(e) => handleMouseDownOnItem(e, item.id)}
                                onClick={(e) => isRemovingBg && handleCanvasClickForBgRemoval(e)}
                            >
                                <div className={`w-full h-full relative transition-all duration-150`}>
                                    <div className={`absolute -inset-0.5 border-2 rounded transition-all duration-150 pointer-events-none 
                                        ${isSelected ? 'border-primary' : 'border-transparent'}
                                        ${(isColliding || isOutOfBounds) ? '!border-red-500' : ''}
                                    `}></div>

                                    {item.imageUrl ? (
                                      <img 
                                          src={item.imageUrl} 
                                          className="w-full h-full object-contain pointer-events-none" 
                                          alt=""
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-destructive/50 flex items-center justify-center text-white text-xs font-mono p-1">Re-upload required</div>
                                    )}

                                    {isSelected && !isRemovingBg && (
                                        <>
                                            <div 
                                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-primary cursor-se-resize rounded-sm z-20"
                                                onMouseDown={(e) => handleMouseDownOnResizeHandle(e, item.id)}
                                            ></div>
                                            <div 
                                                className="absolute -top-6 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-primary rounded-full cursor-alias flex items-center justify-center z-20"
                                                onMouseDown={(e) => handleMouseDownOnRotateHandle(e, item.id, itemRef.current!)}
                                            >
                                              <RotateCw className="w-3 h-3 text-primary"/>
                                            </div>
                                            <button 
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-20 border-2 border-background"
                                                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                 </div>
            </div>
            <div className="w-full flex justify-between text-muted-foreground text-xs mt-2 font-mono">
                <span>0"</span>
                <span>{sheetConfig?.width || 0}"</span>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground flex items-center">
                <Move className="w-4 h-4 mr-2" />
                Click and drag images to arrange. Overlapping items will be highlighted red.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
