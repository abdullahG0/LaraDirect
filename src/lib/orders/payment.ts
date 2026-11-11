// Payment confirmation (step 4.4). Called by the Stripe webhook, by the order page when Stripe
// redirects back (so local demos work without `stripe listen`), and by the no-Stripe demo path.
// Idempotent: only a pending_payment order moves to paid.
import type { Db } from '@/lib/supabase/db';
import { addOrderEvent, transitionOrder } from './lifecycle';
import { notifyAdmins, notifyCustomer } from './notify';
import { submitOrder } from './submit';

export interface MarkPaidInput {
  paymentIntent?: string | null;
  sessionId?: string | null;
  source: 'stripe_webhook' | 'stripe_return' | 'demo';
}

export async function markOrderPaid(
  db: Db,
  orderId: string,
  input: MarkPaidInput,
): Promise<{ changed: boolean }> {
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, status, margin_alert')
    .eq('id', orderId)
    .single();
  if (!order || order.status !== 'pending_payment') return { changed: false };

  try {
    await transitionOrder(db, orderId, 'paid', {
      actor: input.source === 'demo' ? 'demo' : 'stripe',
      type: 'payment.succeeded',
      message:
        input.source === 'demo'
          ? 'Payment simulated (demo mode, Stripe not configured)'
          : 'Payment received via Stripe',
      data: { source: input.source, paymentIntent: input.paymentIntent ?? null },
      patch: {
        paid_at: new Date().toISOString(),
        stripe_payment_intent: input.paymentIntent ?? null,
        ...(input.sessionId ? { stripe_session_id: input.sessionId } : {}),
      },
    });
  } catch {
    return { changed: false }; // another worker got there first
  }

  await notifyCustomer(db, orderId, 'order_confirmation');
  if (order.margin_alert) {
    await notifyAdmins(
      db,
      `Below-floor margin on ${order.order_number}`,
      'This order was paid with a margin below the floor. It will still be submitted (demo setting).',
      orderId,
    );
  }

  // Kick off submission straight away; the retry cron picks it up if this fails.
  try {
    await submitOrder(db, orderId);
  } catch (err) {
    await addOrderEvent(db, orderId, 'submit.deferred', `Submission deferred: ${(err as Error).message}`);
  }
  return { changed: true };
}
