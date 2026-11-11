import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { listAdminProducts } from '@/lib/admin/products';
import { audit, withAdmin } from '@/lib/auth/admin';
import { CATALOGUE_TAG } from '@/lib/catalogue/queries';
import { recalculate } from '@/lib/pricing/rules';
import type { ProductUpdate } from '@/lib/supabase/db';
import { HttpError, parseBody } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// GET /api/admin/products
export const GET = withAdmin('viewer', async (_req, { db }) =>
  NextResponse.json((await listAdminProducts(db)).rows),
);

// PATCH /api/admin/products: overrides and toggles for one product (step 6.6).
const patchSchema = z.object({
  id: z.string().uuid(),
  priceOverrideIncVat: z.number().positive().max(100000).nullable().optional(),
  isPublished: z.boolean().optional(),
  featured: z.boolean().optional(),
  titleOverride: z.string().trim().max(200).nullable().optional(),
  descriptionOverride: z.string().trim().max(4000).nullable().optional(),
  images: z
    .array(
      z
        .string()
        .trim()
        .regex(/^\/[\w\-./]+$/, 'Images must be site paths like /products/abc-1.webp'),
    )
    .max(8)
    .optional(),
});

const FIELDS = {
  priceOverrideIncVat: 'price_override_inc_vat',
  isPublished: 'is_published',
  featured: 'featured',
  titleOverride: 'title_override',
  descriptionOverride: 'description_override',
  images: 'images',
} as const;

export const PATCH = withAdmin('products.manage', async (req, { admin, db }) => {
  const body = await parseBody(req, patchSchema);
  const { data: before } = await db.from('products').select('*').eq('id', body.id).maybeSingle();
  if (!before) throw new HttpError(404, 'NOT_FOUND', 'Product not found');

  const patch: ProductUpdate = { updated_at: new Date().toISOString() };
  const changed: Record<string, unknown> = {};
  const prev: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(FIELDS) as [
    keyof typeof FIELDS,
    (typeof FIELDS)[keyof typeof FIELDS],
  ][]) {
    if (body[key] === undefined) continue;
    let value = body[key];
    if ((key === 'titleOverride' || key === 'descriptionOverride') && value === '') value = null;
    (patch as Record<string, unknown>)[column] = value;
    changed[column] = value;
    prev[column] = before[column];
  }
  const { error } = await db.from('products').update(patch).eq('id', body.id);
  if (error) throw new HttpError(500, 'DB', error.message);

  if ('price_override_inc_vat' in changed) {
    await recalculate(db, {
      productIds: [body.id],
      reason: changed.price_override_inc_vat === null ? 'admin: override removed' : 'admin: price override',
      actor: admin.id,
    });
  }
  await audit(db, admin, 'product.update', 'product', body.id, prev, changed);
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json({ ok: true });
});
