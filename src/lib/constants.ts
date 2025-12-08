import { SheetSize } from "./types";

export const PPI = 72; // Pixels per inch for display

export const SHEET_DIMENSIONS: Record<SheetSize, { width: number; height: number; price: number; }> = {
    [SheetSize.SMALL]: { width: 22, height: 24, price: 24.00 },
    [SheetSize.MEDIUM]: { width: 22, height: 36, price: 36.00 },
    [SheetSize.LARGE]: { width: 22, height: 60, price: 55.00 },
    [SheetSize.XL]: { width: 22, height: 120, price: 100.00 },
    [SheetSize.XXL]: { width: 22, height: 240, price: 180.00 },
};
