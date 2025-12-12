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
    const filePath = path.join(process.cwd(), 'src', 'lib', 'placeholder-images-data.ts');
    const fileContents = await fs.readFile(filePath, 'utf8');
    
    // This is a bit more complex because we're manipulating a TS file, not JSON
    // We'll use a regex to find and replace the URL for a specific ID.
    
    // Regex to find the imageUrl for a given id. It's a bit fragile but works for this structure.
    // It looks for: "id": "the_id", ... "imageUrl": "the_url"
    const regex = new RegExp(`(\"id\":\\s*\"${id}\"[^{]*\"imageUrl\":\\s*\")[^"]*(\")`);

    if (!regex.test(fileContents)) {
        throw new Error(`Image with id "${id}" not found in the data file.`);
    }

    const newFileContents = fileContents.replace(regex, `$1${newUrl}$2`);

    await fs.writeFile(filePath, newFileContents);

    // Revalidate the path to ensure Next.js serves the updated data
    revalidatePath('/admin/media');
    revalidatePath('/'); // Also revalidate home page in case the image is used there

    return {success: true};
  } catch (error) {
    console.error('Failed to update placeholder image URL:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {success: false, error: message};
  }
}
