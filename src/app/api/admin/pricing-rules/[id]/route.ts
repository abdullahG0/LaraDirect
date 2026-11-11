import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { audit, withAdmin } from '@/lib/auth/admin';
import { CATALOGUE_TAG } from '@/lib/catalogue/queries';
import { recalculate } from '@/lib/pricing/rules';
import { HttpError, parseBody } from '@/lib/utils/errors';
import { pricingRuleInputSchema, ruleToRow } from '@/lib/validation/pricing';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/pricing-rules/[id]: update, re-price, write history + audit (acceptance #5).
export const PATCH = withAdmin<{ id: string }>('pricing.manage', async (req, { admin, db, params }) => {
  const input = await parseBody(req, pricingRuleInputSchema);
  const { data: before } = await db.from('pricing_rules').select('*').eq('id', params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'NOT_FOUND', 'Rule not found');
  const { data: after, error } = await db
    .from('pricing_rules')
    .update(ruleToRow(input))
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'DB', error.message);
  const recalc = await recalculate(db, {
    reason: `rule edited: ${input.scope}${input.scopeValue ? ` ${input.scopeValue}` : ''}`,
    actor: admin.id,
  });
  await audit(db, admin, 'pricing_rule.update', 'pricing_rule', params.id, before, after);
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json({ rule: after, recalc });
});

// DELETE /api/admin/pricing-rules/[id]
export const DELETE = withAdmin<{ id: string }>('pricing.manage', async (_req, { admin, db, params }) => {
  const { data: before } = await db.from('pricing_rules').select('*').eq('id', params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'NOT_FOUND', 'Rule not found');
  if (before.scope === 'global')
    throw new HttpError(409, 'PROTECTED', 'The global rule can be edited but not deleted');
  const { error } = await db.from('pricing_rules').delete().eq('id', params.id);
  if (error) throw new HttpError(500, 'DB', error.message);
  const recalc = await recalculate(db, {
    reason: `rule deleted: ${before.scope} ${before.scope_value ?? ''}`.trim(),
    actor: admin.id,
  });
  await audit(db, admin, 'pricing_rule.delete', 'pricing_rule', params.id, before, null);
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json({ ok: true, recalc });
});
