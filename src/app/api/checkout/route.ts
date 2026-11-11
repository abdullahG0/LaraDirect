import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createOrder } from '@/lib/orders/create';
import { markOrderPaid } from '@/lib/orders/payment';
import { createCheckoutSession, stripeConfigured } from '@/lib/payments/stripe';
import { getSettings } from '@/lib/settings';
import { createServiceClient } from '@/lib/supabase/server';
import { HttpError, handle, parseBody } from '@/lib/utils/errors';
import { clientIp, rateLimit } from '@/lib/utils/rate-limit';
import { checkoutRequestSchema } from '@/lib/validation/checkout';

export const dynamic = 'force-dynamic';

// POST /api/checkout (step 4.3): validate, re-price from the DB, live stock check, create the
// pending order, then hand off to Stripe Checkout (test mode). Rate-limited per IP.
export const POST = handle(async (req: Request) => {
  const rl = rateLimit(`checkout:${clientIp(req)}`, 10, 10 * 60_000);
  if (!rl.ok)
    throw new HttpError(
      429,
      'RATE_LIMITED',
      `Too many checkout attempts. Try again in ${rl.retryAfterSec} seconds.`,
    );

  const body = await parseBody(req, checkoutRequestSchema);
  const db = createServiceClient();
  const settings = await getSettings(db);
  const user = await getCurrentUser();
  const order = await createOrder(db, body, settings, { userId: user?.id ?? null });
  const orderUrl = `/order/${encodeURIComponent(order.orderNumber)}?token=${order.accessToken}`;

  if (stripeConfigured()) {
    const session = await createCheckoutSession(order);
    await db.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    return NextResponse.json({ orderNumber: order.orderNumber, redirectUrl: session.url, mode: 'stripe' });
  }

  // No Stripe test key: the demo simulates payment so the rest of the lifecycle can be shown.
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    throw new HttpError(503, 'PAYMENTS_UNAVAILABLE', 'Payments are not configured.');
  }
  await markOrderPaid(db, order.id, { source: 'demo' });
  return NextResponse.json({ orderNumber: order.orderNumber, redirectUrl: orderUrl, mode: 'demo' });
});
