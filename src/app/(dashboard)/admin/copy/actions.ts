
'use server';

import {promises as fs} from 'fs';
import path from 'path';
import {revalidatePath} from 'next/cache';

// This server action updates the text content data file.

export async function updateTextContent(id: string, newText: string) {
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'text-content-data.ts');
    const fileContents = await fs.readFile(filePath, 'utf8');
    
    // This more robust regex looks for the object with the matching id, then finds its 'text' property.
    // It correctly handles nested structures and special characters by lazily matching any character.
    const regex = new RegExp(`(\\{\\s*"id":\\s*"${id}"(?:[\\s\\S]*?)"text":\\s*\`)([\\s\\S]*?)(\`\\s*\\})`);

    if (!regex.test(fileContents)) {
        throw new Error(`Text content with id "${id}" not found in the data file.`);
    }

    // Escape backticks within the new text to avoid breaking the template literal
    const escapedNewText = newText.replace(/`/g, '\\`');

    const newFileContents = fileContents.replace(regex, `$1${escapedNewText}$3`);

    await fs.writeFile(filePath, newFileContents);

    // Revalidate all paths to ensure the new content is served
    revalidatePath('/', 'layout');

    return {success: true};
  } catch (error) {
    console.error('Failed to update text content:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {success: false, error: message};
  }
}
