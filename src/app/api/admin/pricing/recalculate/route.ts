import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { audit, withAdmin } from '@/lib/auth/admin';
import { CATALOGUE_TAG } from '@/lib/catalogue/queries';
import { recalculate } from '@/lib/pricing/rules';

export const dynamic = 'force-dynamic';

// POST /api/admin/pricing/recalculate: re-price every product with the current rules.
export const POST = withAdmin('pricing.manage', async (_req, { admin, db }) => {
  const result = await recalculate(db, { reason: 'admin: recalculate all', actor: admin.id });
  await audit(db, admin, 'pricing.recalculate', 'product', null, null, result);
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json(result);
});
