
import { textContentData, TextContentItem } from './text-content-data';

// Create a map for efficient lookups
const textContentMap = new Map<string, string>();
textContentData.forEach(item => {
  textContentMap.set(item.id, item.text);
});

// Create a proxy to return a helpful message for missing keys
export const textContent = new Proxy(textContentMap, {
  get(target, prop: string) {
    if (target.has(prop)) {
      return target.get(prop);
    }
    // In a development environment, this helps identify missing text content keys.
    if (process.env.NODE_ENV === 'development') {
        console.warn(`Text content with id "${prop}" not found.`);
        return `[Missing Text: ${prop}]`;
    }
    return ''; // Return an empty string in production for missing keys
  },
});

export const AllTextContent: TextContentItem[] = textContentData;
