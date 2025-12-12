import fs from 'fs';
import path from 'path';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// Use fs.readFileSync to avoid HMR issues with JSON files in Turbopack
function getPlaceholderImages(): ImagePlaceholder[] {
  try {
    const jsonPath = path.join(process.cwd(), 'src', 'lib', 'placeholder-images.json');
    const fileContents = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(fileContents);
    return data.placeholderImages || [];
  } catch (error) {
    console.error("Could not read placeholder-images.json:", error);
    return [];
  }
}

export const PlaceHolderImages: ImagePlaceholder[] = getPlaceholderImages();
