'use server';

import { CartItem } from "@/lib/types";
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-02-24.acacia',
});

export async function createCheckoutSession(cartItems: CartItem[], shippingCost: number = 0, tax: number = 0): Promise<{ success: boolean; sessionId?: string; url?: string; error?: string }> {
  try {
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
    
    // Map cart items to Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: item.type === 'product' && item.artwork?.imageUrl ? [item.artwork.imageUrl] : undefined,
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects cents
      },
      quantity: item.quantity,
    }));

    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Shipping' },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Estimated Tax' },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    return { success: true, sessionId: session.id, url: session.url! };
  } catch (error: any) {
    console.error('Error creating Stripe session:', error);
    return { success: false, error: error.message || 'Failed to create Stripe session' };
  }
}
