
'use server';

import { improveArtworkPrintability, ImproveArtworkPrintabilityInput } from '@/ai/flows/improve-artwork-printability';
import { generateDesignFromPrompt, GenerateDesignFromPromptInput } from '@/ai/flows/generate-design-from-prompt';
import type { ShippingAddress, ShippingRate, OrderItem } from '@/lib/types';
import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';


export async function analyzeArtwork(input: ImproveArtworkPrintabilityInput) {
  try {
    const result = await improveArtworkPrintability(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error analyzing artwork:', error);
    return { success: false, error: 'Failed to analyze artwork.' };
  }
}

export async function generateDesign(input: GenerateDesignFromPromptInput) {
    try {
        const result = await generateDesignFromPrompt(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error generating design:', error);
        return { success: false, error: 'Failed to generate design.' };
    }
}

// This function is now responsible for generating the FINAL print-ready image with customer data
export const generateFinalSheetForPrint = async (
    orderItem: OrderItem,
    orderId: string,
    customerName: string,
    shippingAddress: ShippingAddress,
): Promise<string> => {
    const BASE_DPI = 300;
    const HEADER_HEIGHT_INCHES = 1;
    const BUFFER_INCHES = 0.5; // New buffer
    const HEADER_HEIGHT_PX = HEADER_HEIGHT_INCHES * BASE_DPI;
    const BUFFER_PX = BUFFER_INCHES * BASE_DPI;

    let sourceImageUrl = orderItem.originalSheetUrl;
    let isSingleTransferLayout = orderItem.sheetSizeName === 'Single Design Transfer';
    
    let finalCanvasWidth: number;
    let finalCanvasHeight: number;
    let sheetContentHeightInches: number;


    if (isSingleTransferLayout) {
        const SHEET_WIDTH_INCHES = 22;
        const SPACING_INCHES = 0.25;

        const itemWidthInches = orderItem.sheetWidth;
        const itemHeightInches = orderItem.sheetHeight;

        const itemsPerRow = Math.floor((SHEET_WIDTH_INCHES + SPACING_INCHES) / (itemWidthInches + SPACING_INCHES));
        const numRows = Math.ceil(orderItem.quantity / itemsPerRow);

        sheetContentHeightInches = (itemHeightInches * numRows) + (SPACING_INCHES * (numRows + 1));
        
        finalCanvasWidth = SHEET_WIDTH_INCHES * BASE_DPI;
    } else {
        sheetContentHeightInches = orderItem.sheetHeight;
        finalCanvasWidth = orderItem.sheetWidth * BASE_DPI;
    }
    
    // Calculate total canvas height including header and buffer
    finalCanvasHeight = (sheetContentHeightInches * BASE_DPI) + HEADER_HEIGHT_PX + BUFFER_PX;

    const finalCanvas = createCanvas(finalCanvasWidth, finalCanvasHeight);
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error('No final context');
    
    // --- Load the primary image resource ---
    const sourceImage = await loadImage(sourceImageUrl);


    if (isSingleTransferLayout) {
        const SPACING_INCHES = 0.25;
        const itemWidthInches = orderItem.sheetWidth;
        const itemHeightInches = orderItem.sheetHeight;
        const itemsPerRow = Math.floor((22 + SPACING_INCHES) / (itemWidthInches + SPACING_INCHES));

        let currentX = SPACING_INCHES * BASE_DPI;
        let currentY = HEADER_HEIGHT_PX + BUFFER_PX + (SPACING_INCHES * BASE_DPI); // Start Y after header and buffer
        let placedItems = 0;

        for (let i = 0; i < orderItem.quantity; i++) {
            if (placedItems > 0 && placedItems % itemsPerRow === 0) {
                currentX = SPACING_INCHES * BASE_DPI;
                currentY += (itemHeightInches + SPACING_INCHES) * BASE_DPI;
            }

            finalCtx.drawImage(
                sourceImage,
                currentX,
                currentY,
                itemWidthInches * BASE_DPI,
                itemHeightInches * BASE_DPI
            );

            currentX += (itemWidthInches + SPACING_INCHES) * BASE_DPI;
            placedItems++;
        }
    } else {
        // --- Standard Gang Sheet (already laid out) ---
        // Draw the main artwork after the header and buffer
        finalCtx.drawImage(sourceImage, 0, HEADER_HEIGHT_PX + BUFFER_PX, finalCanvasWidth, orderItem.sheetHeight * BASE_DPI);
    }
    
    // Draw the white header over the top
    finalCtx.fillStyle = 'white';
    finalCtx.fillRect(0, 0, finalCanvasWidth, HEADER_HEIGHT_PX);

    // Generate and draw QR Code
    const origin = 'https://pxl8-final.web.app'; // Use production origin
    const qrUrl = `${origin}/admin?orderId=${orderId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, { width: HEADER_HEIGHT_PX - 20, margin: 1 });
    const qrImg = await loadImage(qrCodeDataUrl);
    finalCtx.drawImage(qrImg, 10, 10);

    // Draw Header Text
    finalCtx.fillStyle = 'black';
    finalCtx.textAlign = 'left';
    finalCtx.textBaseline = 'top';
    const FONT_SIZE_LARGE = BASE_DPI / 4; // approx 75pt
    const FONT_SIZE_MEDIUM = BASE_DPI / 6; // approx 50pt
    const FONT_SIZE_SMALL = BASE_DPI / 8; // approx 37.5pt

    let textY = 15;
    finalCtx.font = `bold ${FONT_SIZE_LARGE}px Arial`;
    finalCtx.fillText(`Order: ${orderId}`, HEADER_HEIGHT_PX, textY);
    textY += FONT_SIZE_LARGE + 15;
    
    finalCtx.font = `bold ${FONT_SIZE_MEDIUM}px Arial`;
    finalCtx.fillText(`To: ${customerName}`, HEADER_HEIGHT_PX, textY);
    textY += FONT_SIZE_MEDIUM + 10;
    
    finalCtx.font = `${FONT_SIZE_SMALL}px Arial`;
    const fullAddress = `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`;
    finalCtx.fillText(`Ship To: ${fullAddress}`, HEADER_HEIGHT_PX, textY);
    textY += FONT_SIZE_SMALL + 15;
    
    const sheetDescription = isSingleTransferLayout
        ? `${orderItem.quantity} x (${orderItem.sheetWidth}" x ${orderItem.sheetHeight}")`
        : `${orderItem.sheetWidth}" x ${orderItem.sheetHeight}" Sheet`;
    finalCtx.fillText(`Sheet: ${sheetDescription}`, HEADER_HEIGHT_PX, textY);

    return finalCanvas.toDataURL('image/png');
};


// --- EasyPost Logic Moved Here and Refactored ---

const fromAddress = {
    street1: '417 MONTGOMERY ST',
    city: 'SAN FRANCISCO',
    state: 'CA',
    zip: '94104',
    country: 'US',
    company: 'PXL8',
    phone: '415-123-4567',
};

async function fetchEasyPostShippingRates(toAddress: ShippingAddress, weightOunces: number): Promise<ShippingRate[]> {
    const apiKey = process.env.EASYPOST_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        console.warn("EasyPost API key is not configured. Returning mock rates.");
        // Return mock rates if API key is not set
        const mockRates: ShippingRate[] = [
            { id: 'rate_1', carrier: 'USPS', service: 'GroundAdvantage', rate: 7.55, deliveryDays: '3-5 business days' },
            { id: 'rate_2', carrier: 'USPS', service: 'Priority', rate: 9.50, deliveryDays: '2-3 business days' },
            { id: 'rate_3', carrier: 'FedEx', service: 'Ground', rate: 12.50, deliveryDays: '1-5 business days' },
        ];
        return mockRates.sort((a,b) => a.rate - b.rate);
    }

    const shipmentPayload = {
        shipment: {
            to_address: {
                name: 'Recipient', // EasyPost requires a name, can be generic
                street1: toAddress.street,
                city: toAddress.city,
                state: toAddress.state,
                zip: toAddress.zip,
                country: toAddress.country
            },
            from_address: fromAddress,
            parcel: {
                weight: weightOunces,
            },
        }
    };

    try {
        const response = await fetch('https://api.easypost.com/v2/shipments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(shipmentPayload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`EasyPost API Error: ${response.status} ${JSON.stringify(errorBody)}`);
        }

        const shipment = await response.json();

        if (!shipment.rates || shipment.rates.length === 0) {
            console.warn("No rates returned from EasyPost for this shipment.");
            return [];
        }

        const formattedRates: ShippingRate[] = shipment.rates.map((rate: any) => ({
            id: rate.id,
            carrier: rate.carrier,
            service: rate.service,
            rate: parseFloat(rate.rate),
            deliveryDays: rate.delivery_days ? `${rate.delivery_days} business days` : 'Not available'
        }));
        
        return formattedRates.sort((a,b) => a.rate - b.rate);

    } catch (error) {
        console.error("EasyPost API Fetch Error:", error);
        return []; // Return empty array on failure
    }
}

export async function getShippingRates(address: ShippingAddress, weightOunces: number) {
    try {
        const rates = await fetchEasyPostShippingRates(address, weightOunces);
        return { success: true, data: rates };
    } catch (error) {
        console.error('Error fetching shipping rates:', error);
        return { success: false, error: 'Failed to fetch shipping rates.' };
    }
}
