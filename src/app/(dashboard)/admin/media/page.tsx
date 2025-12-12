'use client';

import React, {useRef, useState} from 'react';
import {PlaceHolderImages, ImagePlaceholder} from '@/lib/placeholder-images';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {ImageIcon, Link2, Upload} from 'lucide-react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {useToast} from '@/hooks/use-toast';
import {useStorage, useUser} from '@/firebase';
import {uploadFileAndGetURL} from '@/firebase/storage';
import {updatePlaceholderImageUrl} from './actions';

export default function MediaAdminPage() {
  const {toast} = useToast();
  const {user} = useUser();
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleUploadClick = (id: string) => {
    fileInputRefs.current[id]?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, imageId: string) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Authentication Error',
          description: 'You must be logged in to upload files.',
        });
      }
      return;
    }

    setUploadingId(imageId);
    toast({
      title: 'Uploading...',
      description: `Uploading ${file.name}. Please wait.`,
    });

    try {
      // 1. Upload to Firebase Storage
      const downloadURL = await uploadFileAndGetURL(file, user.uid);

      // 2. Call the Server Action to update the JSON file
      const result = await updatePlaceholderImageUrl(imageId, downloadURL);

      if (result.success) {
        toast({
          title: 'Upload Successful',
          description: 'The image has been updated.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred during upload.';
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: message,
      });
    } finally {
      setUploadingId(null);
      // Reset file input to allow re-uploading the same file
      if (fileInputRefs.current[imageId]) {
        fileInputRefs.current[imageId]!.value = '';
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Logo & Photos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage the images used across your website. Uploading a new image will automatically update it everywhere it's used.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PlaceHolderImages.map((image: ImagePlaceholder) => (
          <Card key={image.id} className="overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{image.id}</CardTitle>
                  <CardDescription className="text-xs">{image.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <div className="aspect-video relative bg-checkerboard-dark rounded-md border overflow-hidden mb-4">
                <Image src={image.imageUrl} alt={image.description} fill className="object-contain" />
              </div>
              <div className="relative mb-4">
                <Link2 className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  readOnly
                  value={image.imageUrl}
                  className="w-full text-xs bg-secondary rounded-md pl-8 pr-2 py-2 border text-muted-foreground truncate"
                />
              </div>
              <div className="mt-auto">
                <input
                  type="file"
                  ref={(el) => (fileInputRefs.current[image.id] = el)}
                  className="hidden"
                  onChange={(e) => handleFileChange(e, image.id)}
                  accept="image/png, image/jpeg, image/gif, image/svg+xml"
                  disabled={uploadingId === image.id}
                />
                <Button
                  onClick={() => handleUploadClick(image.id)}
                  disabled={uploadingId === image.id}
                  className="w-full"
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingId === image.id ? 'Uploading...' : 'Upload New'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
