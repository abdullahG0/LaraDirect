import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { markOrderPaid } from '@/lib/orders/payment';
import { addOrderEvent, transitionOrder } from '@/lib/orders/lifecycle';
import { getStripe } from '@/lib/payments/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// POST /api/webhooks/stripe (step 4.4): verifies the signature, records each event id once
// (so resent events change nothing), and marks orders paid.
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret || secret === 'whsec_...')
    return apiError('NOT_CONFIGURED', 'Stripe webhooks are not configured', 503);

  const signature = req.headers.get('stripe-signature');
  if (!signature) return apiError('BAD_SIGNATURE', 'Missing Stripe signature', 400);
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return apiError('BAD_SIGNATURE', `Invalid signature: ${(err as Error).message}`, 400);
  }

  const db = createServiceClient();
  const { error: dupErr } = await db.from('stripe_events').insert({ id: event.id, type: event.type });
  if (dupErr) {
    // 23505 = unique violation: we've already handled this event.
    if (dupErr.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    return apiError('DB', dupErr.message, 500); // Stripe will retry
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id ?? session.client_reference_id;
      if (orderId && session.payment_status === 'paid') {
        await markOrderPaid(db, orderId, {
          source: 'stripe_webhook',
          sessionId: session.id,
          paymentIntent:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
        });
      }
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await transitionOrder(db, orderId, 'cancelled', {
          actor: 'stripe',
          message: 'Checkout session expired without payment',
        }).catch(() => undefined);
      }
    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const orderId = charge.metadata?.order_id;
      if (orderId)
        await addOrderEvent(
          db,
          orderId,
          'payment.refunded',
          'Refund processed in Stripe',
          { amount: charge.amount_refunded / 100 },
          'stripe',
        );
    }
  } catch (err) {
    // Let Stripe retry: forget the event so the retry isn't treated as a duplicate.
    await db.from('stripe_events').delete().eq('id', event.id);
    console.error(`stripe webhook ${event.type}: ${(err as Error).message}`);
    return apiError('INTERNAL', 'Webhook handling failed', 500);
  }
  return NextResponse.json({ received: true });
}
