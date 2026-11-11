import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actorLabel, audit, withAdmin } from '@/lib/auth/admin';
import { addOrderEvent, canTransition, transitionOrder, type OrderStatus } from '@/lib/orders/lifecycle';
import { notifyCustomer, type CustomerTemplate } from '@/lib/orders/notify';
import { refreshOrder } from '@/lib/orders/refresh';
import { submitOrder } from '@/lib/orders/submit';
import { distributorFor } from '@/lib/services/distributor';
import type { Json } from '@/lib/supabase/db';
import { HttpError, parseBody } from '@/lib/utils/errors';
import { normalisePostcode, UK_POSTCODE } from '@/lib/validation/checkout';

export const dynamic = 'force-dynamic';

// POST /api/admin/orders/[id]/{retry|cancel|refresh|note|resend|refund|address} (step 6.5).
// Each writes order_events (via the lifecycle helpers) and audit_log.

const noteSchema = z.object({ text: z.string().trim().min(1, 'Write a note').max(2000) });
const resendSchema = z.object({
  template: z.enum(['order_confirmation', 'order_dispatched', 'order_delivered', 'order_problem']),
});
const cancelSchema = z.object({ reason: z.string().trim().max(500).optional() }).default({});
const addressSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(120).nullable().optional(),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().min(2).max(80),
  postcode: z.string().trim().regex(UK_POSTCODE, 'Enter a valid UK postcode').transform(normalisePostcode),
  phone: z.string().trim().min(9).max(20),
});

const ACTIONS = ['retry', 'cancel', 'refresh', 'note', 'resend', 'refund', 'address'] as const;
type Action = (typeof ACTIONS)[number];

export const POST = withAdmin<{ id: string; action: string }>(
  'orders.manage',
  async (req, { admin, db, params }) => {
    const action = params.action as Action;
    if (!ACTIONS.includes(action)) throw new HttpError(404, 'NOT_FOUND', 'Unknown action');

    const { data: order } = await db.from('orders').select('*').eq('id', params.id).maybeSingle();
    if (!order) throw new HttpError(404, 'NOT_FOUND', 'Order not found');
    const status = order.status as OrderStatus;
    const actor = actorLabel(admin);

    switch (action) {
      case 'retry': {
        if (status !== 'failed' && status !== 'submitting' && status !== 'paid') {
          throw new HttpError(
            409,
            'INVALID_STATE',
            `Only failed or unsubmitted orders can be retried (this one is ${status.replace('_', ' ')})`,
          );
        }
        const result = await submitOrder(db, order.id, { actor });
        await audit(db, admin, 'order.retry', 'order', order.id, { status }, result);
        return NextResponse.json(result);
      }

      case 'cancel': {
        const body = await parseBody(req, cancelSchema);
        if (!canTransition(status, 'cancelled')) {
          throw new HttpError(
            409,
            'INVALID_STATE',
            `An order that is ${status.replace('_', ' ')} can’t be cancelled`,
          );
        }
        if (order.distributor_order_id) {
          const d = await distributorFor(db);
          if (!d.cancelOrder)
            throw new HttpError(409, 'UNSUPPORTED', 'The distributor does not support cancellation via API');
          const r = await d.cancelOrder(order.distributor_order_id);
          if (!r.cancelled)
            throw new HttpError(
              409,
              'DISTRIBUTOR_REFUSED',
              `TD SYNNEX refused the cancellation: ${r.reason ?? 'no reason given'}`,
            );
        }
        await transitionOrder(db, order.id, 'cancelled', {
          actor,
          message: `Cancelled by ${admin.name ?? admin.email}${body.reason ? `: ${body.reason}` : ''}`,
          data: { reason: body.reason ?? null },
        });
        if (order.paid_at) {
          await addOrderEvent(
            db,
            order.id,
            'refund.required',
            'Payment was taken: issue a refund in Stripe, then mark as refunded',
            {},
            actor,
          );
        }
        await audit(
          db,
          admin,
          'order.cancel',
          'order',
          order.id,
          { status },
          { status: 'cancelled', reason: body.reason ?? null },
        );
        return NextResponse.json({ ok: true, refundRequired: !!order.paid_at });
      }

      case 'refresh': {
        const changed = await refreshOrder(db, order.id);
        return NextResponse.json({ changed });
      }

      case 'note': {
        const { text } = await parseBody(req, noteSchema);
        await addOrderEvent(db, order.id, 'note', text, {}, actor);
        await audit(db, admin, 'order.note', 'order', order.id, null, { text });
        return NextResponse.json({ ok: true });
      }

      case 'resend': {
        const { template } = await parseBody(req, resendSchema);
        await notifyCustomer(db, order.id, template as CustomerTemplate);
        await audit(db, admin, 'order.resend_email', 'order', order.id, null, { template });
        return NextResponse.json({ ok: true });
      }

      case 'refund': {
        if (status !== 'cancelled')
          throw new HttpError(409, 'INVALID_STATE', 'Cancel the order before marking it refunded');
        await transitionOrder(db, order.id, 'refunded', {
          actor,
          message: `Marked as refunded by ${admin.name ?? admin.email}`,
        });
        await audit(db, admin, 'order.refund', 'order', order.id, { status }, { status: 'refunded' });
        return NextResponse.json({ ok: true });
      }

      case 'address': {
        if (order.distributor_order_id || !['pending_payment', 'paid', 'failed'].includes(status)) {
          throw new HttpError(
            409,
            'INVALID_STATE',
            'The address can only be changed before the order is sent to TD SYNNEX',
          );
        }
        const next = await parseBody(req, addressSchema);
        const before = order.ship_to;
        const shipTo = { ...(before as object), ...next, country: 'GB' };
        await db
          .from('orders')
          .update({ ship_to: shipTo as Json, updated_at: new Date().toISOString() })
          .eq('id', order.id);
        await addOrderEvent(
          db,
          order.id,
          'address.updated',
          'Delivery address updated',
          { before, after: shipTo },
          actor,
        );
        await audit(db, admin, 'order.address', 'order', order.id, before, shipTo);
        return NextResponse.json({ ok: true });
      }
    }
  },
);
