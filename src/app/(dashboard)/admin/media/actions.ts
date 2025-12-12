'use server';

import {promises as fs} from 'fs';
import path from 'path';
import {revalidatePath} from 'next/cache';
import type {ImagePlaceholder} from '@/lib/placeholder-images';

// This is a server-side action to update the JSON file.
// It's not directly callable from the client in a way that would expose the file system.
// Next.js creates a secure endpoint for this function.

export async function updatePlaceholderImageUrl(id: string, newUrl: string) {
  try {
    const jsonPath = path.join(process.cwd(), 'src', 'lib', 'placeholder-images.json');
    const fileContents = await fs.readFile(jsonPath, 'utf8');
    const data = JSON.parse(fileContents);

    const imageIndex = data.placeholderImages.findIndex((img: ImagePlaceholder) => img.id === id);

    if (imageIndex === -1) {
      throw new Error(`Image with id "${id}" not found.`);
    }

    data.placeholderImages[imageIndex].imageUrl = newUrl;

    await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));

    // Revalidate the path to ensure Next.js serves the updated JSON file
    revalidatePath('/admin/media');
    revalidatePath('/'); // Also revalidate home page in case the image is used there

    return {success: true};
  } catch (error) {
    console.error('Failed to update placeholder image URL:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {success: false, error: message};
  }
}
