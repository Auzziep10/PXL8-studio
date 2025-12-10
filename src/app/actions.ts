'use server';

import { improveArtworkPrintability, ImproveArtworkPrintabilityInput } from '@/ai/flows/improve-artwork-printability';
import { generateDesignFromPrompt, GenerateDesignFromPromptInput } from '@/ai/flows/generate-design-from-prompt';
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
        console.error("EasyPost API key is not configured.");
        return [];
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
        return [];
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
