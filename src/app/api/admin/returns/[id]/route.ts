import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canMoveReturn, RETURN_STATUSES, type ReturnStatus } from '@/lib/admin/returns';
import { actorLabel, audit, withAdmin } from '@/lib/auth/admin';
import { addOrderEvent } from '@/lib/orders/lifecycle';
import { HttpError, parseBody } from '@/lib/utils/errors';

// PATCH /api/admin/returns/[id]: move status, update notes or the TD SYNNEX RMA reference.
const schema = z.object({
  status: z.enum(RETURN_STATUSES).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  tdsRmaReference: z.string().trim().max(60).nullable().optional(),
});

export const PATCH = withAdmin<{ id: string }>('returns.manage', async (req, { admin, db, params }) => {
  const body = await parseBody(req, schema);
  const { data: before } = await db.from('returns').select('*').eq('id', params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'NOT_FOUND', 'Return not found');
  if (
    body.status &&
    body.status !== before.status &&
    !canMoveReturn(before.status as ReturnStatus, body.status)
  ) {
    throw new HttpError(409, 'INVALID_STATE', `A ${before.status} return can’t move to ${body.status}`);
  }
  const patch = {
    updated_at: new Date().toISOString(),
    ...(body.status && { status: body.status }),
    ...(body.notes !== undefined && { notes: body.notes }),
    ...(body.tdsRmaReference !== undefined && { tds_rma_reference: body.tdsRmaReference }),
  };
  const { data: after, error } = await db
    .from('returns')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'DB', error.message);
  if (body.status && body.status !== before.status && before.order_id) {
    await addOrderEvent(
      db,
      before.order_id,
      `return.${body.status}`,
      `Return ${body.status}`,
      { returnId: params.id },
      actorLabel(admin),
    );
  }
  await audit(db, admin, 'return.update', 'return', params.id, before, after);
  return NextResponse.json(after);
});
