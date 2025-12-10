
'use server';

import { ShippingAddress, ShippingRate } from "@/lib/types";
import EasyPostClient from '@easypost/api';

const client = new EasyPostClient(process.env.EASYPOST_API_KEY as string);

// IMPORTANT: Update this with your actual business address
const fromAddress = {
    street1: '417 MONTGOMERY ST',
    city: 'SAN FRANCISCO',
    state: 'CA',
    zip: '94104',
    country: 'US',
    company: 'PXL8',
    phone: '415-123-4567',
};

export async function fetchShippingRates(toAddress: ShippingAddress, weightOunces: number): Promise<ShippingRate[]> {
    if (!process.env.EASYPOST_API_KEY || process.env.EASYPOST_API_KEY === 'YOUR_API_KEY_HERE') {
        console.error("EasyPost API key is not configured.");
        return [];
    }
    
    try {
        const shipment = await client.Shipment.create({
            to_address: {
                name: 'Recipient', // EasyPost requires a name
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
        });

        if (!shipment.rates || shipment.rates.length === 0) {
            console.warn("No rates returned from EasyPost for this shipment.");
            return [];
        }

        const formattedRates: ShippingRate[] = shipment.rates.map(rate => ({
            id: rate.id,
            carrier: rate.carrier,
            service: rate.service,
            rate: parseFloat(rate.rate),
            deliveryDays: rate.delivery_days ? `${rate.delivery_days} business days` : 'Not available'
        }));
        
        return formattedRates.sort((a,b) => a.rate - b.rate);

    } catch (error) {
        console.error("EasyPost API Error:", error);
        // In a real app, you might want to return a user-friendly error or a default rate
        return [];
    }
}
