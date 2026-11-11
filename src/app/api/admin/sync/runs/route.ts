import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/admin';

// GET /api/admin/sync/runs: recent sync runs (step 6.8).
export const GET = withAdmin('viewer', async (_req, { db }) => {
  const { data } = await db.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(50);
  return NextResponse.json(data ?? []);
});
