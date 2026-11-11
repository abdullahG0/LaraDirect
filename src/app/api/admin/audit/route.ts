import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/lib/auth/admin';
import { parseWith } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// GET /api/admin/audit?entity=&action=&limit= (step 7.6)
const schema = z.object({
  entity: z.string().max(40).optional(),
  action: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200),
});

export const GET = withAdmin('audit.view', async (req, { db }) => {
  const q = parseWith(schema, Object.fromEntries(new URL(req.url).searchParams));
  let query = db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(q.limit);
  if (q.entity) query = query.eq('entity', q.entity);
  if (q.action) query = query.ilike('action', `${q.action}%`);
  const { data } = await query;
  return NextResponse.json(data ?? []);
});
