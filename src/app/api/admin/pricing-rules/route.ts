import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { audit, withAdmin } from '@/lib/auth/admin';
import { CATALOGUE_TAG } from '@/lib/catalogue/queries';
import { loadRules, recalculate } from '@/lib/pricing/rules';
import { HttpError, parseBody } from '@/lib/utils/errors';
import { pricingRuleInputSchema, ruleToRow } from '@/lib/validation/pricing';

export const dynamic = 'force-dynamic';

// GET /api/admin/pricing-rules
export const GET = withAdmin('viewer', async (_req, { db }) => NextResponse.json(await loadRules(db)));

// POST /api/admin/pricing-rules: create a rule, then re-price everything (spec §7.3).
export const POST = withAdmin('pricing.manage', async (req, { admin, db }) => {
  const input = await parseBody(req, pricingRuleInputSchema);
  const { data, error } = await db
    .from('pricing_rules')
    .insert({ ...ruleToRow(input), created_by: admin.id })
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'DB', error.message);
  const recalc = await recalculate(db, {
    reason: `rule created: ${input.scope}${input.scopeValue ? ` ${input.scopeValue}` : ''}`,
    actor: admin.id,
  });
  await audit(db, admin, 'pricing_rule.create', 'pricing_rule', data.id, null, data);
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json({ rule: data, recalc });
});
