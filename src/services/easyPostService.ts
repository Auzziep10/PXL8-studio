'use server';

import { ShippingAddress, ShippingRate } from "@/lib/types";

// This is a mock function that simulates fetching shipping rates from EasyPost.
// In a real application, you would use the EasyPost Node.js client library.
export async function fetchShippingRates(toAddress: ShippingAddress, weightOunces: number): Promise<ShippingRate[]> {
    console.log(`Fetching mock shipping rates for ${weightOunces}oz to ${toAddress.zip}...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Simulate different rates based on destination zip code for variety
    const zipPrefix = parseInt(toAddress.zip.substring(0, 2), 10);
    let baseRate = 5.00;

    if (zipPrefix >= 90) { // West Coast
        baseRate = 7.50;
    } else if (zipPrefix >= 60) { // Midwest
        baseRate = 9.00;
    } else if (zipPrefix >= 30) { // Southeast
        baseRate = 6.50;
    } else { // Northeast
        baseRate = 8.50;
    }
    
    // Add weight cost
    baseRate += (weightOunces / 16) * 1.50; // $1.50 per pound

    // Return a set of mock rates
    const mockRates: ShippingRate[] = [
        {
            id: 'rate_mock_usps_ground',
            carrier: 'USPS',
            service: 'Ground Advantage',
            rate: baseRate,
            deliveryDays: '3-5 business days'
        },
        {
            id: 'rate_mock_usps_priority',
            carrier: 'USPS',
            service: 'Priority Mail',
            rate: baseRate + 4.50,
            deliveryDays: '2-3 business days'
        },
        {
            id: 'rate_mock_ups_ground',
            carrier: 'UPS',
            service: 'Ground',
            rate: baseRate + 1.25,
            deliveryDays: '4 business days'
        },
        {
            id: 'rate_mock_ups_2day',
            carrier: 'UPS',
            service: '2nd Day Air',
            rate: baseRate + 15.75,
            deliveryDays: '2 business days'
        }
    ];

    // Simulate a random failure chance
    if (Math.random() < 0.05) {
        throw new Error("Mock API Error: Failed to fetch shipping rates.");
    }
    
    return mockRates.sort((a,b) => a.rate - b.rate);
}
