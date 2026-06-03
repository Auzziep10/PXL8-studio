'use server';

import { CartItem } from "@/lib/types";
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2026-04-22.dahlia',
});

export async function createCheckoutSession(
  cartItems: CartItem[], 
  shippingCost: number = 0, 
  customerEmail?: string,
  shippingAddress?: { name: string; line1: string; city: string; state: string; postal_code: string; country: string }
): Promise<{ success: boolean; sessionId?: string; url?: string; error?: string }> {
  try {
    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
    
    // Map cart items to Stripe line items
    const lineItems: any[] = cartItems.map(item => {
      let name = '';
      let price = 0;
      let imageUrls: string[] | undefined = undefined;

      if (item.type === 'sheet') {
        name = item.sheetSize.name;
        price = item.sheetSize.price;
        if (item.previewUrl && !item.previewUrl.startsWith('data:')) {
          imageUrls = [item.previewUrl];
        }
      } else if (item.type === 'dynamic_sheet') {
        name = item.name;
        price = item.price;
        if (item.previewUrl && !item.previewUrl.startsWith('data:')) {
          imageUrls = [item.previewUrl];
        }
      } else if (item.type === 'service') {
        name = item.name;
        price = item.price;
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: name,
            images: imageUrls,
          },
          unit_amount: Math.round(price * 100), // Stripe expects cents
        },
        quantity: item.quantity,
      };
    });

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

    let customerId: string | undefined = undefined;

    if (customerEmail) {
      try {
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          if (shippingAddress) {
            await stripe.customers.update(customerId, {
              name: shippingAddress.name,
              address: {
                line1: shippingAddress.line1,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postal_code: shippingAddress.postal_code,
                country: shippingAddress.country,
              },
              shipping: {
                name: shippingAddress.name,
                address: {
                  line1: shippingAddress.line1,
                  city: shippingAddress.city,
                  state: shippingAddress.state,
                  postal_code: shippingAddress.postal_code,
                  country: shippingAddress.country,
                }
              }
            });
          }
        } else {
          const customer = await stripe.customers.create({
            email: customerEmail,
            name: shippingAddress?.name,
            address: shippingAddress ? {
              line1: shippingAddress.line1,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country,
            } : undefined,
            shipping: shippingAddress ? {
              name: shippingAddress.name,
              address: {
                line1: shippingAddress.line1,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postal_code: shippingAddress.postal_code,
                country: shippingAddress.country,
              }
            } : undefined,
          });
          customerId = customer.id;
        }
      } catch (e) {
        console.warn("Failed to create or update Stripe customer, falling back to email:", e);
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      ...(customerId ? { customer: customerId } : { customer_email: customerEmail }),
      automatic_tax: {
        enabled: false,
      },
      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    return { success: true, sessionId: session.id, url: session.url! };
  } catch (error: any) {
    console.error('Error creating Stripe session:', error);
    return { success: false, error: error.message || 'Failed to create Stripe session' };
  }
}
