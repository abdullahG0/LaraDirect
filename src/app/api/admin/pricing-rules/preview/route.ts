import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdmin } from '@/lib/auth/admin';
import { previewRuleChange } from '@/lib/pricing/rules';
import { parseBody } from '@/lib/utils/errors';
import { pricingRuleInputSchema } from '@/lib/validation/pricing';

export const dynamic = 'force-dynamic';

// POST /api/admin/pricing-rules/preview: impact of a proposed change, nothing saved (spec §11.1).
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), rule: pricingRuleInputSchema }),
  z.object({ action: z.literal('update'), id: z.string().uuid(), rule: pricingRuleInputSchema }),
  z.object({ action: z.literal('delete'), id: z.string().uuid() }),
]);

export const POST = withAdmin('viewer', async (req, { db }) => {
  const change = await parseBody(req, schema);
  return NextResponse.json(await previewRuleChange(db, change));
});
