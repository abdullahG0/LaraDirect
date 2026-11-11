import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { markOrderPaid } from '@/lib/orders/payment';
import { getPublicOrder } from '@/lib/orders/public';
import { getStripe } from '@/lib/payments/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { OrderTracker } from './order-tracker';

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

interface Props {
  params: { orderNumber: string };
  searchParams: { token?: string; session_id?: string };
}

export default async function OrderPage({ params, searchParams }: Props) {
  const orderNumber = decodeURIComponent(params.orderNumber);
  const token = searchParams.token ?? '';
  const db = createServiceClient();

  let found = await getPublicOrder(db, orderNumber, token);
  if (!found) notFound();

  // Back from Stripe: confirm the payment directly, so the page doesn't depend on the webhook
  // arriving first (and local demos work without `stripe listen`). Idempotent with the webhook.
  const sessionId = searchParams.session_id;
  const stripe = getStripe();
  if (sessionId && stripe && found.order.status === 'pending_payment') {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.order_id === found.id && session.payment_status === 'paid') {
        await markOrderPaid(db, found.id, {
          source: 'stripe_return',
          sessionId,
          paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        });
        found = (await getPublicOrder(db, orderNumber, token)) ?? found;
      }
    } catch (err) {
      console.warn(`stripe return check failed: ${(err as Error).message}`);
    }
  }

  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6">
      <OrderTracker
        initial={found.order}
        token={token}
        justPlaced={!!sessionId || found.order.events.length <= 3}
        demoMode={process.env.NEXT_PUBLIC_DEMO_MODE === 'true'}
      />
    </div>
  );
}
