'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, FileCheck2 } from 'lucide-react';
import { mockSheetSizes } from '@/lib/data';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function PrebuiltUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [suggestedSheet, setSuggestedSheet] = useState<string | null>(null);
  const { toast } = useToast();
  const DPI = 300;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
        const img = new window.Image();
        img.onload = () => {
          const widthInches = img.naturalWidth / DPI;
          const heightInches = img.naturalHeight / DPI;
          setDimensions({ width: widthInches, height: heightInches });

          // Suggest sheet size
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          let bestFit = null;
          let minWaste = Infinity;

          for (const sheet of mockSheetSizes) {
            if (widthInches <= sheet.width && heightInches <= sheet.height) {
              const waste = (sheet.width * sheet.height) - (widthInches * heightInches);
              if (waste < minWaste) {
                minWaste = waste;
                bestFit = sheet;
              }
            }
          }
          if(bestFit) {
             setSuggestedSheet(bestFit.name);
          } else {
             setSuggestedSheet("Custom size needed");
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleAddToCart = () => {
    // This is a mock implementation. A real app would use the useCart hook.
    toast({
        title: "Added to Cart",
        description: `${file?.name} on a ${suggestedSheet} sheet.`
    });
  }

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>Upload Pre-built Gang Sheet</CardTitle>
          <p className="text-muted-foreground">For professionals who build their sheets in Photoshop or Illustrator.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!filePreview ? (
            <Label htmlFor="prebuilt-upload-input" className="w-full">
              <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-secondary hover:bg-muted">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-lg text-muted-foreground"><span className="font-semibold">Click to upload your sheet</span></p>
                  <p className="text-sm text-muted-foreground">High-resolution PNG with transparency</p>
                </div>
                <Input id="prebuilt-upload-input" type="file" className="hidden" onChange={handleFileChange} accept="image/png" />
              </div>
            </Label>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2">Image Preview</h3>
                    <div className="aspect-video relative rounded-lg overflow-hidden border">
                         <Image src={filePreview} alt="Uploaded sheet preview" layout="fill" objectFit="contain" />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="font-semibold mb-2">File Details</h3>
                    <div className="p-4 bg-secondary rounded-lg space-y-2">
                        <p className="text-sm flex justify-between"><strong>File Name:</strong> <span className='truncate ml-2'>{file?.name}</span></p>
                        {dimensions && (
                            <>
                            <p className="text-sm flex justify-between"><strong>Dimensions:</strong> <span>{dimensions.width.toFixed(2)}" x {dimensions.height.toFixed(2)}"</span></p>
                             <p className="text-sm flex justify-between"><strong>Suggested Size:</strong> <span className="font-bold text-primary">{suggestedSheet}</span></p>
                            </>
                        )}
                    </div>
                    <div className="p-4 bg-green-500/10 text-green-300 rounded-lg flex items-start gap-3">
                        <FileCheck2 className="h-5 w-5 mt-0.5 text-accent"/>
                        <p className="text-sm">Your file looks good! We've detected the dimensions and suggested the most cost-effective sheet size.</p>
                    </div>
                </div>
            </div>
          )}
        </CardContent>
        {filePreview && (
            <CardFooter className='flex justify-end gap-2'>
                <Button variant="outline" onClick={() => { setFile(null); setFilePreview(null); }}>Clear and Upload New</Button>
                <Button onClick={handleAddToCart}>Add to Cart</Button>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
