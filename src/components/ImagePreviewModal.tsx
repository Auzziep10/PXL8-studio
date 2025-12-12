'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import NextImage from 'next/image';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title: string;
  sheetWidth?: number;
  sheetHeight?: number;
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl, title, sheetWidth, sheetHeight }: ImagePreviewModalProps) {
  const aspectRatio = sheetWidth && sheetHeight ? sheetWidth / sheetHeight : 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">A preview of the selected image: {title}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 flex items-center justify-center checkerboard p-4 overflow-auto">
          <div 
            className="relative bg-transparent shadow-lg"
            style={{
              aspectRatio: aspectRatio,
              width: aspectRatio >= 1 ? '100%' : 'auto',
              height: aspectRatio < 1 ? '100%' : 'auto',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            {imageUrl && (
              <NextImage 
                  src={imageUrl} 
                  alt={title} 
                  fill
                  className="object-contain"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
