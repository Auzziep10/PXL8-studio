import { placeholderImagesData } from './placeholder-images-data';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  videoUrl?: string; // Make videoUrl optional
};

// Directly import the data. This works for both client and server components.
export const PlaceHolderImages: ImagePlaceholder[] = placeholderImagesData;
