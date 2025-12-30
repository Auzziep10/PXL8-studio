
'use server';

import {promises as fs} from 'fs';
import path from 'path';
import {revalidatePath} from 'next/cache';
import { placeholderImagesData } from '@/lib/placeholder-images-data';
import type { ImagePlaceholder } from '@/lib/placeholder-images';

export async function updatePlaceholderMediaUrls(id: string, newImageUrl: string, newVideoUrl?: string) {
  try {
    const itemIndex = placeholderImagesData.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      throw new Error(`Media item with id "${id}" not found.`);
    }

    const updatedData = [...placeholderImagesData];
    const currentItem = updatedData[itemIndex];
    
    updatedData[itemIndex] = {
      ...currentItem,
      imageUrl: newImageUrl,
      // Only update videoUrl if it was originally present, maintaining the data structure
      ...(currentItem.videoUrl !== undefined && { videoUrl: newVideoUrl || '' }),
    };

    // Helper function to safely serialize strings for inclusion in a TS file
    const serializeString = (str: string | undefined) => {
        if (str === undefined) return 'undefined';
        // Basic escaping for quotes and backslashes
        return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    };
    
    // Re-create the file content from the updated data array
    const newFileContents = `
export const placeholderImagesData = [
${updatedData.map(item => `    {
      "id": ${serializeString(item.id)},
      "description": ${serializeString(item.description)},
      "imageUrl": ${serializeString(item.imageUrl)},
      "imageHint": ${serializeString(item.imageHint)}${item.videoUrl !== undefined ? `,\n      "videoUrl": ${serializeString(item.videoUrl)}` : ''}
    }`).join(',\n')}
]
`.trim();

    const filePath = path.join(process.cwd(), 'src', 'lib', 'placeholder-images-data.ts');
    await fs.writeFile(filePath, newFileContents, 'utf-8');

    // Revalidate paths to ensure Next.js serves the updated data
    revalidatePath('/admin/media', 'page');
    revalidatePath('/', 'layout'); // Revalidate everything

    return {success: true};
  } catch (error) {
    console.error('Failed to update placeholder media URLs:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {success: false, error: message};
  }
}
