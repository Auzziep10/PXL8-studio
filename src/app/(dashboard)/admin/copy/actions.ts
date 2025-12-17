
'use server';

import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { textContentData, TextContentItem } from '@/lib/text-content-data';

// This server action updates the text content data file.
// It now imports the data directly, modifies it in memory, and then re-serializes the entire file.
// This is much more robust than using a regular expression.

export async function updateTextContent(id: string, newText: string) {
  try {
    const itemIndex = textContentData.findIndex(item => item.id === id);

    if (itemIndex === -1) {
      throw new Error(`Text content with id "${id}" not found in the data.`);
    }

    // Create a new array with the updated item to avoid direct mutation
    const updatedData = [...textContentData];
    updatedData[itemIndex] = {
        ...updatedData[itemIndex],
        text: newText,
    };

    // Helper function to safely serialize a string for inclusion in a template literal
    const serializeString = (str: string) => {
        return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    };

    // Re-create the file content from the updated data array
    const newFileContents = `
export type TextContentItem = {
  id: string;
  description: string;
  text: string;
};

export const textContentData: TextContentItem[] = [
${updatedData.map(item => `  {
    "id": "${serializeString(item.id)}",
    "description": \`${serializeString(item.description)}\`,
    "text": \`${serializeString(item.text)}\`
  }`).join(',\n')}
];
`.trim();
    
    const filePath = path.join(process.cwd(), 'src', 'lib', 'text-content-data.ts');
    await fs.writeFile(filePath, newFileContents);

    // Revalidate all paths to ensure the new content is served
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error) {
    console.error('Failed to update text content:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: message };
  }
}
