// Stripe Checkout in test mode (spec §2, §10.4). If no usable test key is configured, the demo
// falls back to an instant simulated payment so the order flow still works end to end.
import Stripe from 'stripe';
import type { CreatedOrder } from '@/lib/orders/create';
import { DELIVERY_LABELS } from '@/lib/basket/totals';
import { siteUrl } from '@/lib/orders/notify';

let client: Stripe | null | undefined;

export function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return /^sk_test_[A-Za-z0-9]{20,}/.test(key);
}

export function getStripe(): Stripe | null {
  if (client === undefined) {
    client = stripeConfigured() ? new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true }) : null;
  }
  return client;
}

const pence = (gbp: number) => Math.round(gbp * 100);

export async function createCheckoutSession(order: CreatedOrder): Promise<{ id: string; url: string }> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  const base = siteUrl();
  const t = order.totals;

  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (t.discount > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: pence(t.discount),
      currency: 'gbp',
      duration: 'once',
      name: t.promo?.code ?? 'Discount',
      max_redemptions: 1,
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: order.orderNumber },
      payment_intent_data: { metadata: { order_id: order.id, order_number: order.orderNumber } },
      line_items: order.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: pence(l.unitPriceIncVat),
          tax_behavior: 'inclusive',
          product_data: { name: l.name },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: DELIVERY_LABELS[t.deliveryMethod].label,
            fixed_amount: { amount: pence(t.shipping), currency: 'gbp' },
            tax_behavior: 'inclusive',
          },
        },
      ],
      discounts,
      success_url: `${base}/order/${encodeURIComponent(order.orderNumber)}?token=${order.accessToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { id: session.id, url: session.url };
}
