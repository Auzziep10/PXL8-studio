
'use server';

import { improveArtworkPrintability, ImproveArtworkPrintabilityInput } from '@/ai/flows/improve-artwork-printability';
import { generateDesignFromPrompt, GenerateDesignFromPromptInput } from '@/ai/flows/generate-design-from-prompt';
import { addTextToImage, AddTextToImageInput } from '@/ai/flows/add-text-to-image';
import type { ShippingAddress, ShippingRate } from '@/lib/types';

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

export async function addTextToImage(input: AddTextToImageInput) {
    try {
        const result = await addTextToImage(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error adding text to image:', error);
        return { success: false, error: 'Failed to add text to image.' };
    }
}


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
