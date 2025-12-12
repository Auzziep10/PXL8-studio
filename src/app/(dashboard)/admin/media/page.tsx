
'use client';

import React from 'react';
import { PlaceHolderImages, ImagePlaceholder } from '@/lib/placeholder-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon, Link2 } from 'lucide-react';
import Image from 'next/image';

export default function MediaAdminPage() {

  return (
    <div className="max-w-6xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold">Logo & Photos</h1>
            <p className="text-muted-foreground text-sm mt-1">
                Manage the images used across your website.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PlaceHolderImages.map((image: ImagePlaceholder) => (
                <Card key={image.id} className="overflow-hidden">
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
                    <CardContent>
                        <div className="aspect-video relative bg-checkerboard-dark rounded-md border overflow-hidden mb-4">
                            <Image 
                                src={image.imageUrl} 
                                alt={image.description}
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div className="relative">
                            <Link2 className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input 
                                readOnly
                                value={image.imageUrl}
                                className="w-full text-xs bg-secondary rounded-md pl-8 pr-2 py-2 border text-muted-foreground"
                            />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  );
}
