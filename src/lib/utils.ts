import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to format currency
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

// Helper to sanitize filenames
export function sanitizeFilename(name: string): string {
    if (!name) return 'untitled';
    return name
        .replace(/(\r\n|\n|\r)/gm, " ") // Replace newlines with a space
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s\.-]/g, '') // Remove invalid chars except spaces, dots, hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .substring(0, 75) // Truncate
        .replace(/-+/g, '-') // Collapse multiple hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
