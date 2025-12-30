
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PlaceHolderImages, ImagePlaceholder } from '@/lib/placeholder-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon, Link2, Upload, Save, Video } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { uploadFileAndGetURL } from '@/firebase/storage';
import { updatePlaceholderMediaUrls } from './actions';
import { Label } from '@/components/ui/label';

export default function MediaAdminPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Local state to manage the URL inputs
  const [editableUrls, setEditableUrls] = useState<Record<string, { imageUrl: string, videoUrl?: string }>>({});

  useEffect(() => {
    // Initialize the editable URLs from the static data source
    const initialUrls = PlaceHolderImages.reduce((acc, image) => {
        acc[image.id] = {
            imageUrl: image.imageUrl,
            videoUrl: image.videoUrl
        };
        return acc;
    }, {} as Record<string, { imageUrl: string, videoUrl?: string }>);
    setEditableUrls(initialUrls);
  }, []);

  const handleUrlChange = (id: string, field: 'imageUrl' | 'videoUrl', value: string) => {
      setEditableUrls(prev => ({
          ...prev,
          [id]: {
              ...prev[id],
              [field]: value
          }
      }));
  };

  const handleUrlSave = async (id: string) => {
    if (!editableUrls[id]) return;
    setSavingId(id);
    toast({ title: 'Saving...', description: `Updating URLs for ${id}.` });

    try {
        const { imageUrl, videoUrl } = editableUrls[id];
        const result = await updatePlaceholderMediaUrls(id, imageUrl, videoUrl);
        if (result.success) {
            toast({ title: 'Save Successful', description: 'The media URLs have been updated.' });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Save failed:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({ variant: 'destructive', title: 'Save Failed', description: message });
    } finally {
        setSavingId(null);
    }
  };


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
      const result = await updatePlaceholderMediaUrls(imageId, downloadURL, editableUrls[imageId]?.videoUrl);

      if (result.success) {
        // Also update local state to show the new URL immediately
        handleUrlChange(imageId, 'imageUrl', downloadURL);
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
              <div className="aspect-video relative checkerboard rounded-md border overflow-hidden mb-4">
                <Image src={image.imageUrl} alt={image.description} fill className="object-contain" />
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Label htmlFor={`image-url-${image.id}`} className="text-xs font-medium text-muted-foreground flex items-center mb-1"><Link2 className="w-3 h-3 mr-1" /> Image URL</Label>
                  <input
                    id={`image-url-${image.id}`}
                    value={editableUrls[image.id]?.imageUrl || ''}
                    onChange={(e) => handleUrlChange(image.id, 'imageUrl', e.target.value)}
                    className="w-full text-xs bg-background border-input rounded-md pl-2 pr-2 py-2 border text-foreground truncate"
                  />
                </div>

                {image.videoUrl !== undefined && (
                  <div className="relative">
                    <Label htmlFor={`video-url-${image.id}`} className="text-xs font-medium text-muted-foreground flex items-center mb-1"><Video className="w-3 h-3 mr-1" /> Video URL</Label>
                    <input
                      id={`video-url-${image.id}`}
                      value={editableUrls[image.id]?.videoUrl || ''}
                      onChange={(e) => handleUrlChange(image.id, 'videoUrl', e.target.value)}
                      className="w-full text-xs bg-background border-input rounded-md pl-2 pr-2 py-2 border text-foreground truncate"
                    />
                  </div>
                )}
              </div>
              
              <div className="mt-auto pt-4 space-y-2">
                <Button
                    onClick={() => handleUrlSave(image.id)}
                    disabled={savingId === image.id}
                    className="w-full"
                    variant="secondary"
                 >
                    <Save className="mr-2 h-4 w-4" />
                    {savingId === image.id ? 'Saving...' : 'Save URL(s)'}
                </Button>
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
                  {uploadingId === image.id ? 'Uploading...' : 'Upload New Image'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
