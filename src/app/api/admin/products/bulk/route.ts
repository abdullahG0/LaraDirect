import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { audit, withAdmin } from '@/lib/auth/admin';
import { CATALOGUE_TAG } from '@/lib/catalogue/queries';
import { recalculate } from '@/lib/pricing/rules';
import { HttpError, parseBody } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// POST /api/admin/products/bulk (step 6.6): publish, unpublish, feature, unfeature, apply markup.
// "Apply markup" writes a SKU-level pricing rule per product, so prices stay rule-driven and
// keep tracking cost changes (rather than freezing a manual price).
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.enum(['publish', 'unpublish', 'feature', 'unfeature', 'clear_override']),
    ids: z.array(z.string().uuid()).min(1).max(1000),
  }),
  z.object({
    action: z.literal('markup'),
    ids: z.array(z.string().uuid()).min(1).max(1000),
    markupPct: z.number().min(0).max(200),
    minMarginPct: z.number().min(0).max(90).optional(),
  }),
]);

export const POST = withAdmin('products.manage', async (req, { admin, db }) => {
  const body = await parseBody(req, schema);
  const now = new Date().toISOString();

  switch (body.action) {
    case 'publish':
    case 'unpublish': {
      const { error } = await db
        .from('products')
        .update({ is_published: body.action === 'publish', updated_at: now })
        .in('id', body.ids);
      if (error) throw new HttpError(500, 'DB', error.message);
      break;
    }
    case 'feature':
    case 'unfeature': {
      const { error } = await db
        .from('products')
        .update({ featured: body.action === 'feature', updated_at: now })
        .in('id', body.ids);
      if (error) throw new HttpError(500, 'DB', error.message);
      break;
    }
    case 'clear_override': {
      const { error } = await db
        .from('products')
        .update({ price_override_inc_vat: null, updated_at: now })
        .in('id', body.ids);
      if (error) throw new HttpError(500, 'DB', error.message);
      await recalculate(db, {
        productIds: body.ids,
        reason: 'admin: override removed (bulk)',
        actor: admin.id,
      });
      break;
    }
    case 'markup': {
      const { data: products } = await db.from('products').select('id, distributor_sku').in('id', body.ids);
      const skus = (products ?? []).map((p) => p.distributor_sku);
      const { data: existing } = await db
        .from('pricing_rules')
        .select('id, scope_value')
        .eq('scope', 'sku')
        .in('scope_value', skus);
      const have = new Map((existing ?? []).map((r) => [r.scope_value, r.id]));
      for (const sku of skus) {
        const values = {
          markup_type: 'percent',
          markup_value: body.markupPct,
          ...(body.minMarginPct !== undefined && { min_margin_pct: body.minMarginPct }),
          is_active: true,
        };
        if (have.has(sku)) await db.from('pricing_rules').update(values).eq('id', have.get(sku)!);
        else
          await db
            .from('pricing_rules')
            .insert({ scope: 'sku', scope_value: sku, created_by: admin.id, ...values });
      }
      await recalculate(db, {
        productIds: body.ids,
        reason: `admin: bulk markup ${body.markupPct}%`,
        actor: admin.id,
      });
      break;
    }
  }

  await audit(db, admin, `product.bulk_${body.action}`, 'product', null, null, body);
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json({ ok: true, count: body.ids.length });
});
