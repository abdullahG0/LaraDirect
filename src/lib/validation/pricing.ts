// Zod schema for pricing rules: shared by the admin rule editor form and the pricing-rules API (spec §7, §13).
import { z } from 'zod';
import type { PricingRule } from '@/lib/pricing/engine';

export const pricingRuleInputSchema = z
  .object({
    scope: z.enum(['global', 'category', 'brand', 'sku']),
    scopeValue: z.string().trim().max(120).nullable().optional(),
    markupType: z.enum(['percent', 'fixed']),
    markupValue: z.coerce.number().min(0).max(1000),
    minMarginPct: z.coerce.number().min(0).max(90).default(0),
    minMarginAmount: z.coerce.number().min(0).max(10000).default(0),
    rounding: z.enum(['none', 'x.99', 'x.95', 'nearest_1']).default('x.99'),
    priority: z.coerce.number().int().min(-100).max(100).default(0),
    isActive: z.boolean().default(true),
  })
  .superRefine((r, ctx) => {
    if (r.scope === 'global' && r.scopeValue) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeValue'],
        message: 'A global rule applies to everything; leave this blank',
      });
    }
    if (r.scope !== 'global' && !r.scopeValue) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeValue'],
        message: `Choose which ${r.scope} this rule applies to`,
      });
    }
    if (r.markupType === 'percent' && r.markupValue > 200) {
      ctx.addIssue({
        code: 'custom',
        path: ['markupValue'],
        message: 'Percentage markup looks too high (over 200%)',
      });
    }
  })
  .transform((r) => ({ ...r, scopeValue: r.scope === 'global' ? null : (r.scopeValue ?? null) }));

export type PricingRuleInput = z.infer<typeof pricingRuleInputSchema>;

/** Row shape of the `pricing_rules` table (spec §6). Numerics arrive as strings from Postgres. */
export interface PricingRuleRow {
  id: string;
  scope: PricingRule['scope'];
  scope_value: string | null;
  markup_type: PricingRule['markupType'];
  markup_value: number | string;
  min_margin_pct: number | string | null;
  min_margin_amount: number | string | null;
  rounding: PricingRule['rounding'] | null;
  priority: number | null;
  is_active: boolean | null;
}

export function ruleFromRow(row: PricingRuleRow): PricingRule {
  return {
    id: row.id,
    scope: row.scope,
    scopeValue: row.scope_value,
    markupType: row.markup_type,
    markupValue: Number(row.markup_value),
    minMarginPct: Number(row.min_margin_pct ?? 0),
    minMarginAmount: Number(row.min_margin_amount ?? 0),
    rounding: row.rounding ?? 'x.99',
    priority: row.priority ?? 0,
    isActive: row.is_active ?? true,
  };
}

export interface PricingRuleWrite {
  scope: PricingRule['scope'];
  scope_value: string | null;
  markup_type: PricingRule['markupType'];
  markup_value: number;
  min_margin_pct: number;
  min_margin_amount: number;
  rounding: PricingRule['rounding'];
  priority: number;
  is_active: boolean;
}

export function ruleToRow(r: PricingRuleInput): PricingRuleWrite {
  return {
    scope: r.scope,
    scope_value: r.scopeValue,
    markup_type: r.markupType,
    markup_value: r.markupValue,
    min_margin_pct: r.minMarginPct,
    min_margin_amount: r.minMarginAmount,
    rounding: r.rounding,
    priority: r.priority,
    is_active: r.isActive,
  };
}
