import placeholderData from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// Directly import the JSON data. This works for both client and server components.
export const PlaceHolderImages: ImagePlaceholder[] = placeholderData.placeholderImages;
