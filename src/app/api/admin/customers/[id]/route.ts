import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, withAdmin } from '@/lib/auth/admin';
import { HttpError, parseBody } from '@/lib/utils/errors';

// PATCH /api/admin/customers/[id]: internal notes (step 7.1).
const schema = z.object({ notes: z.string().max(5000) });

export const PATCH = withAdmin<{ id: string }>('customers.manage', async (req, { admin, db, params }) => {
  const { notes } = await parseBody(req, schema);
  const { data: before } = await db.from('customers').select('notes').eq('id', params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'NOT_FOUND', 'Customer not found');
  const { error } = await db.from('customers').update({ notes }).eq('id', params.id);
  if (error) throw new HttpError(500, 'DB', error.message);
  await audit(db, admin, 'customer.notes', 'customer', params.id, before, { notes });
  return NextResponse.json({ ok: true });
});
