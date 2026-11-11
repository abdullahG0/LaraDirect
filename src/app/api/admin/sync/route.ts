import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { audit, withAdmin } from '@/lib/auth/admin';
import { CATALOGUE_TAG } from '@/lib/catalogue/queries';
import { distributorFor } from '@/lib/services/distributor';
import { syncCatalogue } from '@/lib/sync/catalogue-sync';
import { parseBody } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/admin/sync: "Sync now", per-category sync, or one product (step 6.8).
const schema = z
  .object({ category: z.string().max(80).optional(), sku: z.string().max(60).optional() })
  .default({});

export const POST = withAdmin('sync.run', async (req, { admin, db }) => {
  const body = await parseBody(req, schema);
  const result = await syncCatalogue(db, await distributorFor(db), {
    type: body.sku ? 'product' : body.category ? 'category' : 'manual',
    category: body.category,
    sku: body.sku,
    actor: admin.id,
  });
  await audit(db, admin, 'sync.run', 'sync_run', result.runId, null, {
    ...body,
    priceChanges: result.priceChanges,
    stockChanges: result.stockChanges,
    errors: result.errors,
  });
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json(result);
});
