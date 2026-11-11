import { NextResponse } from 'next/server';
import { z } from 'zod';
import { actorLabel, audit, withAdmin } from '@/lib/auth/admin';
import { addOrderEvent } from '@/lib/orders/lifecycle';
import { HttpError, parseBody } from '@/lib/utils/errors';

// POST /api/admin/returns: log a return against an order (step 7.3).
const schema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  reason: z.string().trim().min(2, 'Give a reason').max(500),
  tdsRmaReference: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const POST = withAdmin('returns.manage', async (req, { admin, db }) => {
  const body = await parseBody(req, schema);
  const { data: order } = await db
    .from('orders')
    .select('id, status')
    .ilike('order_number', body.orderNumber)
    .maybeSingle();
  if (!order) throw new HttpError(404, 'NOT_FOUND', `No order ${body.orderNumber}`);
  const { data, error } = await db
    .from('returns')
    .insert({
      order_id: order.id,
      reason: body.reason,
      tds_rma_reference: body.tdsRmaReference || null,
      notes: body.notes || null,
    })
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'DB', error.message);
  await addOrderEvent(
    db,
    order.id,
    'return.requested',
    `Return logged: ${body.reason}`,
    { returnId: data.id },
    actorLabel(admin),
  );
  await audit(db, admin, 'return.create', 'return', data.id, null, data);
  return NextResponse.json(data);
});
