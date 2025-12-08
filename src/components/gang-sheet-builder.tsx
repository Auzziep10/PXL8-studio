'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  Trash2,
  UploadCloud,
  Wand2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
} from 'lucide-react';
import { mockSheetSizes } from '@/lib/data';
import type { ArtworkOnCanvas, SheetSize, Artwork } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { analyzeArtwork } from '@/app/actions';
import AiAnalysisPanel from './ai-analysis-panel';
import { useCart } from '@/hooks/use-cart.tsx';
import { cn } from '@/lib/utils';

const DPI = 300; // Standard print DPI

export default function GangSheetBuilder() {
  const [selectedSheet, setSelectedSheet] = useState<SheetSize>(
    mockSheetSizes[2]
  );
  const [artworks, setArtworks] = useState<ArtworkOnCanvas[]>([]);
  const [zoom, setZoom] = useState(0.5);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(
    null
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragInfo = useRef<{
    isDragging: boolean;
    artworkId: string | null;
    offsetX: number;
    offsetY: number;
  }>({ isDragging: false, artworkId: null, offsetX: 0, offsetY: 0 });

  const { toast } = useToast();
  const cart = useCart();
  const addItem = cart.addItem;

  const canvasWidth = selectedSheet.width * DPI * zoom;
  const canvasHeight = selectedSheet.height * DPI * zoom;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    artworks.forEach((art) => {
      const img = document.getElementById(
        `img-${art.id}`
      ) as HTMLImageElement;
      if (img) {
        ctx.drawImage(img, art.x, art.y, art.canvasWidth, art.canvasHeight);

        // Collision detection
        const isOutOfBounds =
          art.x < 0 ||
          art.y < 0 ||
          art.x + art.canvasWidth > canvas.width ||
          art.y + art.canvasHeight > canvas.height;

        let isOverlapping = false;
        for (const otherArt of artworks) {
          if (art.id === otherArt.id) continue;
          if (
            art.x < otherArt.x + otherArt.canvasWidth &&
            art.x + art.canvasWidth > otherArt.x &&
            art.y < otherArt.y + otherArt.canvasHeight &&
            art.y + art.canvasHeight > otherArt.y
          ) {
            isOverlapping = true;
            break;
          }
        }

        if (isOutOfBounds || isOverlapping) {
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 4 * zoom;
          ctx.strokeRect(art.x, art.y, art.canvasWidth, art.canvasHeight);
        }

        if (art.id === selectedArtworkId) {
            ctx.strokeStyle = 'hsl(var(--primary))';
            ctx.lineWidth = 4 * zoom;
            ctx.strokeRect(art.x, art.y, art.canvasWidth, art.canvasHeight);
        }
      }
    });
  }, [artworks, zoom, canvasWidth, canvasHeight, selectedArtworkId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new window.Image();
          img.onload = () => {
            const newArtwork: ArtworkOnCanvas = {
              id: `${Date.now()}-${Math.random()}`,
              name: file.name,
              imageUrl: img.src,
              width: img.naturalWidth / DPI,
              height: img.naturalHeight / DPI,
              dpi: DPI,
              x: 0,
              y: 0,
              canvasWidth: img.naturalWidth * zoom,
              canvasHeight: img.naturalHeight * zoom,
              quantity: 1,
            };
            setArtworks((prev) => [...prev, newArtwork]);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const updateArtworkSize = (id: string, newWidthInches: number) => {
    setArtworks(artworks.map(art => {
      if (art.id === id) {
        const aspectRatio = art.height / art.width;
        const newHeightInches = newWidthInches * aspectRatio;
        return {
          ...art,
          width: newWidthInches,
          height: newHeightInches,
          canvasWidth: newWidthInches * DPI * zoom,
          canvasHeight: newHeightInches * DPI * zoom,
        };
      }
      return art;
    }));
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedArtwork = [...artworks].reverse().find(art => 
        mouseX >= art.x && mouseX <= art.x + art.canvasWidth &&
        mouseY >= art.y && mouseY <= art.y + art.canvasHeight
    );

    if (clickedArtwork) {
        setSelectedArtworkId(clickedArtwork.id);
        dragInfo.current = {
            isDragging: true,
            artworkId: clickedArtwork.id,
            offsetX: mouseX - clickedArtwork.x,
            offsetY: mouseY - clickedArtwork.y,
        };
    } else {
        setSelectedArtworkId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragInfo.current.isDragging || !dragInfo.current.artworkId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setArtworks(currentArtworks =>
      currentArtworks.map(art =>
        art.id === dragInfo.current.artworkId
          ? {
              ...art,
              x: mouseX - dragInfo.current.offsetX,
              y: mouseY - dragInfo.current.offsetY,
            }
          : art
      )
    );
  };

  const handleMouseUp = () => {
    dragInfo.current.isDragging = false;
  };

  const handleDuplicateArtwork = (artworkId: string) => {
    const artworkToDuplicate = artworks.find(art => art.id === artworkId);
    if (!artworkToDuplicate) return;

    const newArtwork: ArtworkOnCanvas = {
      ...artworkToDuplicate,
      id: `${Date.now()}-${Math.random()}`,
      x: artworkToDuplicate.x + 20, // Simple offset
      y: artworkToDuplicate.y + 20,
    };
    
    setArtworks(prev => [...prev, newArtwork]);
    setSelectedArtworkId(newArtwork.id); // Select the new one
  };
  
  const handleAnalyze = async (artworkId: string) => {
    const artwork = artworks.find(a => a.id === artworkId);
    if (!artwork) return;

    setArtworks(arts => arts.map(a => a.id === artworkId ? { ...a, analysisLoading: true } : a));

    const result = await analyzeArtwork({
      artworkDataUri: artwork.imageUrl,
      artworkDescription: artwork.name,
    });
    
    if (result.success && result.data) {
      setArtworks(arts => arts.map(a => a.id === artworkId ? { ...a, analysis: result.data, analysisLoading: false } : a));
      toast({ title: 'Analysis Complete', description: `Printability Score: ${result.data.printabilityScore}/100`});
    } else {
      setArtworks(arts => arts.map(a => a.id === artworkId ? { ...a, analysisLoading: false } : a));
      toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
    }
  };

  const handleAddToCart = () => {
    const canvas = canvasRef.current;
    if (!canvas || artworks.length === 0) {
        toast({ variant: 'destructive', title: 'Cannot add to cart', description: 'Your sheet is empty.'});
        return;
    }

    // Generate a temporary full-res image for the cart
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = selectedSheet.width * DPI;
    tempCanvas.height = selectedSheet.height * DPI;
    const tempCtx = tempCanvas.getContext('2d');
    
    if(!tempCtx) return;

    artworks.forEach(art => {
      const img = document.getElementById(`img-${art.id}`) as HTMLImageElement;
      if (img) {
        const originalX = (art.x / zoom)
        const originalY = (art.y / zoom)
        const originalWidth = art.width * DPI;
        const originalHeight = art.height * DPI;
        tempCtx.drawImage(img, originalX, originalY, originalWidth, originalHeight);
      }
    });
    
    const compositeImageUrl = tempCanvas.toDataURL('image/png');

    const cartItem = {
      id: `sheet-${Date.now()}`,
      sheetSize: selectedSheet,
      compositeImageUrl,
      artworks: artworks,
      quantity: 1,
    };
    
    addItem(cartItem);

    toast({ title: 'Added to Cart', description: `${selectedSheet.name} gang sheet.` });
  };
  
  const selectedArtwork = artworks.find(art => art.id === selectedArtworkId);


  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-muted">
       <div style={{ display: 'none' }}>
        {artworks.map((art) => (
          <img id={`img-${art.id}`} src={art.imageUrl} key={art.id} alt={art.name} crossOrigin="anonymous"/>
        ))}
      </div>
      <aside className="w-[350px] flex flex-col bg-card border-r">
        <CardHeader>
          <CardTitle>Sheet & Artworks</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col gap-4 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="sheet-size">Sheet Size</Label>
            <Select
              value={selectedSheet.name}
              onValueChange={(val) =>
                setSelectedSheet(mockSheetSizes.find((s) => s.name === val)!)
              }
            >
              <SelectTrigger id="sheet-size">
                <SelectValue placeholder="Select sheet size" />
              </SelectTrigger>
              <SelectContent>
                {mockSheetSizes.map((size) => (
                  <SelectItem key={size.name} value={size.name}>
                    {size.name} (${size.price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-grow flex flex-col border rounded-lg p-2 gap-2 overflow-hidden">
             <Label htmlFor="artwork-upload-button" className="w-full">
                <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-muted">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG (300 DPI recommended)</p>
                    </div>
                    <Input id="artwork-upload-button" type="file" className="hidden" onChange={handleFileChange} multiple accept="image/png, image/jpeg"/>
                </div>
            </Label>
            <ScrollArea className='flex-1'>
              <div className="space-y-2 pr-2">
                {artworks.map(art => (
                  <div key={art.id} className={cn("flex items-center gap-2 p-2 rounded-md border", selectedArtworkId === art.id ? "border-primary bg-primary/10" : "bg-secondary")}>
                    <Image src={art.imageUrl} alt={art.name} width={40} height={40} className="rounded-sm" />
                    <div className="flex-1 text-sm overflow-hidden">
                        <p className="font-medium truncate">{art.name}</p>
                        <p className="text-xs text-muted-foreground">{art.width.toFixed(2)}" x {art.height.toFixed(2)}"</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAnalyze(art.id)} disabled={art.analysisLoading}>
                      <Wand2 className={cn("h-4 w-4", art.analysisLoading && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setArtworks(artworks.filter(a => a.id !== art.id))}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </aside>

      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-auto checkerboard p-8" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="bg-background/80 shadow-2xl mx-auto"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          />
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <Button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} variant="outline" size="icon"><ZoomOut className="h-4 w-4"/></Button>
            <span className="p-2 bg-background/80 rounded-md border text-sm">{Math.round(zoom * 100)}%</span>
            <Button onClick={() => setZoom(z => Math.min(2, z + 0.1))} variant="outline" size="icon"><ZoomIn className="h-4 w-4"/></Button>
        </div>
         <div className="absolute bottom-4 right-4">
            <Button size="lg" onClick={handleAddToCart}>Add to Cart</Button>
        </div>
      </main>
      
      <aside className="w-[350px] flex flex-col bg-card border-l">
        <CardHeader>
            <CardTitle>Tools & Analysis</CardTitle>
        </CardHeader>
        <CardContent className='flex-1 overflow-y-auto'>
            {selectedArtwork ? (
                <div className='space-y-4'>
                    <div>
                        <Label>Width (inches)</Label>
                        <Input 
                            type="number" 
                            value={selectedArtwork.width.toFixed(2)}
                            onChange={(e) => updateArtworkSize(selectedArtwork.id, parseFloat(e.target.value))}
                        />
                    </div>
                    <div>
                        <Label>Height (inches)</Label>
                        <Input 
                           type="number"
                           value={selectedArtwork.height.toFixed(2)}
                           readOnly
                           className='bg-muted'
                        />
                    </div>
                     <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="w-full" onClick={() => handleDuplicateArtwork(selectedArtwork.id)}>
                            <Copy className="mr-2"/> Duplicate
                        </Button>
                    </div>
                    <AiAnalysisPanel artwork={selectedArtwork} onAnalyze={() => handleAnalyze(selectedArtwork.id)} />
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <p>Select an artwork to see tools and AI analysis.</p>
                </div>
            )}
        </CardContent>
      </aside>
    </div>
  );
}
