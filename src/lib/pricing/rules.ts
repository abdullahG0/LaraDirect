// Pricing persistence (step 2.5): loads rules from Supabase, recalculates sell prices with the
// pure engine, writes products + price_history, and previews rule changes before they apply.
import type { Db } from '@/lib/supabase/db';
import { must } from '@/lib/supabase/db';
import { ruleFromRow, type PricingRuleInput } from '@/lib/validation/pricing';
import { getSettings } from '@/lib/settings';
import {
  calculatePrice,
  previewImpact,
  type ImpactPreview,
  type PricedProduct,
  type PricingRule,
} from './engine';

export async function loadRules(db: Db): Promise<PricingRule[]> {
  const rows = must(await db.from('pricing_rules').select('*'), 'load pricing rules');
  return rows.map((r) => ruleFromRow(r as Parameters<typeof ruleFromRow>[0]));
}

export async function loadVatRate(db: Db): Promise<number> {
  return (await getSettings(db)).vatRate;
}

const PRICING_COLUMNS =
  'id, distributor_sku, name, brand, category, cost_price_ex_vat, price_override_inc_vat, sell_price_inc_vat, sell_price_ex_vat, margin_pct';

interface PricingProductRow {
  id: string;
  distributor_sku: string;
  name: string;
  brand: string;
  category: string;
  cost_price_ex_vat: number;
  price_override_inc_vat: number | null;
  sell_price_inc_vat: number | null;
  sell_price_ex_vat: number | null;
  margin_pct: number | null;
}

async function loadPricingProducts(db: Db, productIds?: string[]): Promise<PricingProductRow[]> {
  const out: PricingProductRow[] = [];
  // Page through in chunks: PostgREST caps responses at 1000 rows by default.
  for (let from = 0; ; from += 1000) {
    let q = db
      .from('products')
      .select(PRICING_COLUMNS)
      .order('id')
      .range(from, from + 999);
    if (productIds) q = q.in('id', productIds);
    const rows = must(await q, 'load products for pricing') as unknown as PricingProductRow[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export const toPriced = (p: PricingProductRow): PricedProduct => ({
  id: p.id,
  sku: p.distributor_sku,
  name: p.name,
  brand: p.brand,
  category: p.category,
  costPriceExVat: Number(p.cost_price_ex_vat),
  priceOverrideIncVat: p.price_override_inc_vat === null ? null : Number(p.price_override_inc_vat),
});

export interface RecalcOptions {
  productIds?: string[];
  reason: string;
  actor?: string | null; // admin user id, for price_history.changed_by
  rules?: PricingRule[];
  vatRate?: number;
}

export interface RecalcResult {
  checked: number;
  changed: number;
  belowFloor: number;
}

/**
 * Re-prices products and writes only the rows whose price or margin changed, plus one
 * price_history row per changed price (spec §7.3).
 */
export async function recalculate(db: Db, opts: RecalcOptions): Promise<RecalcResult> {
  if (opts.productIds && opts.productIds.length === 0) return { checked: 0, changed: 0, belowFloor: 0 };
  const [rules, vatRate, products] = await Promise.all([
    opts.rules ?? loadRules(db),
    opts.vatRate ?? loadVatRate(db),
    loadPricingProducts(db, opts.productIds),
  ]);

  let belowFloor = 0;
  const updates: {
    row: PricingProductRow;
    sellEx: number;
    sellInc: number;
    margin: number;
    priceChanged: boolean;
  }[] = [];
  for (const row of products) {
    const r = calculatePrice(toPriced(row), rules, vatRate);
    if (r.marginStatus !== 'ok') belowFloor++;
    // Stored sell price is the effective selling price (the override when set), as in the seed.
    const sellInc = r.sellPriceIncVat;
    const sellEx = r.sellPriceExVat;
    const priceChanged = Number(row.sell_price_inc_vat) !== sellInc;
    if (priceChanged || Number(row.margin_pct) !== r.marginPct || Number(row.sell_price_ex_vat) !== sellEx) {
      updates.push({ row, sellEx, sellInc, margin: r.marginPct, priceChanged });
    }
  }

  const now = new Date().toISOString();
  for (let i = 0; i < updates.length; i += 25) {
    const chunk = updates.slice(i, i + 25);
    await Promise.all(
      chunk.map(async (u) => {
        must(
          await db
            .from('products')
            .update({
              sell_price_ex_vat: u.sellEx,
              sell_price_inc_vat: u.sellInc,
              margin_pct: u.margin,
              updated_at: now,
            })
            .eq('id', u.row.id),
          'update product price',
        );
      }),
    );
  }

  const history = updates
    .filter((u) => u.priceChanged)
    .map((u) => ({
      product_id: u.row.id,
      cost_price_ex_vat: Number(u.row.cost_price_ex_vat),
      sell_price_inc_vat: u.sellInc,
      reason: opts.reason,
      changed_by: opts.actor ?? null,
    }));
  for (let i = 0; i < history.length; i += 500) {
    must(await db.from('price_history').insert(history.slice(i, i + 500)), 'write price history');
  }

  return { checked: products.length, changed: history.length, belowFloor };
}

export type RuleChange =
  | { action: 'create'; rule: PricingRuleInput }
  | { action: 'update'; id: string; rule: PricingRuleInput }
  | { action: 'delete'; id: string };

/** Applies a proposed change to a rule list in memory (for previews). */
export function applyRuleChange(rules: PricingRule[], change: RuleChange): PricingRule[] {
  if (change.action === 'delete') return rules.filter((r) => r.id !== change.id);
  const next: PricingRule = { id: change.action === 'update' ? change.id : 'proposed', ...change.rule };
  return change.action === 'update' ? rules.map((r) => (r.id === change.id ? next : r)) : [...rules, next];
}

/** "Preview impact" before applying a rule change (spec §11.1). */
export async function previewRuleChange(db: Db, change: RuleChange): Promise<ImpactPreview> {
  const [rules, vatRate, products] = await Promise.all([
    loadRules(db),
    loadVatRate(db),
    loadPricingProducts(db),
  ]);
  return previewImpact(products.map(toPriced), rules, applyRuleChange(rules, change), vatRate);
}
