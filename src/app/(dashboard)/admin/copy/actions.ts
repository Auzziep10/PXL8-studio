
'use server';

import {promises as fs} from 'fs';
import path from 'path';
import {revalidatePath} from 'next/cache';

// This server action updates the text content data file.

export async function updateTextContent(id: string, newText: string) {
  try {
    const filePath = path.join(process.cwd(), 'src', 'lib', 'text-content-data.ts');
    const fileContents = await fs.readFile(filePath, 'utf8');
    
    // Use a regex to find and replace the text for a specific ID.
    // This looks for: "id": "the_id", ... "text": "the_old_text"
    // It's designed to be safe with multi-line strings using backticks.
    const regex = new RegExp(`("id":\\s*"${id}"[^{]*"text":\\s*\`)[^\\\`]*(\`)`);

    if (!regex.test(fileContents)) {
        throw new Error(`Text content with id "${id}" not found in the data file.`);
    }

    // Escape backticks within the new text to avoid breaking the template literal
    const escapedNewText = newText.replace(/`/g, '\\`');

    const newFileContents = fileContents.replace(regex, `$1${escapedNewText}$2`);

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
