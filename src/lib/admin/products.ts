// Admin product list (step 6.6): distributor data, LaraDirect overrides and live pricing checks.
import type { Db } from '@/lib/supabase/db';
import { calculatePrice, selectRule, type PricingRule } from '@/lib/pricing/engine';
import { loadRules } from '@/lib/pricing/rules';
import { getSettings } from '@/lib/settings';

export interface AdminProductRow {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string | null;
  image: string | null;
  cost: number;
  sellIncVat: number | null;
  rulePriceIncVat: number;
  overrideIncVat: number | null;
  marginPct: number;
  floorPct: number;
  marginStatus: 'ok' | 'below_floor' | 'negative';
  stockQty: number;
  stockStatus: string;
  isPublished: boolean;
  featured: boolean;
  ruleLabel: string;
  lastSyncedAt: string | null;
}

export function ruleLabel(r: PricingRule | null): string {
  if (!r) return 'No rule';
  const m = r.markupType === 'percent' ? `${r.markupValue}%` : `£${r.markupValue}`;
  return r.scope === 'global' ? `Global ${m}` : `${r.scopeValue} ${m}`;
}

export async function listAdminProducts(
  db: Db,
): Promise<{ rows: AdminProductRow[]; vatRate: number; rules: PricingRule[] }> {
  const [rules, settings, res] = await Promise.all([
    loadRules(db),
    getSettings(db),
    db
      .from('products')
      .select(
        'id, distributor_sku, name, title_override, brand, category, subcategory, images, cost_price_ex_vat, sell_price_inc_vat, price_override_inc_vat, stock_qty, stock_status, is_published, featured, last_synced_at',
      )
      .order('category')
      .order('name')
      .limit(5000),
  ]);
  if (res.error) throw new Error(res.error.message);
  const rows = res.data.map((p) => {
    const input = {
      sku: p.distributor_sku,
      brand: p.brand,
      category: p.category,
      costPriceExVat: Number(p.cost_price_ex_vat),
    };
    const live = calculatePrice(
      { ...input, priceOverrideIncVat: p.price_override_inc_vat },
      rules,
      settings.vatRate,
    );
    const rulePrice = live.overridden
      ? calculatePrice(input, rules, settings.vatRate).sellPriceIncVat
      : live.sellPriceIncVat;
    const rule = selectRule(input, rules);
    return {
      id: p.id,
      sku: p.distributor_sku,
      name: p.title_override ?? p.name,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory,
      image: p.images?.[0] ?? null,
      cost: Number(p.cost_price_ex_vat),
      sellIncVat: p.sell_price_inc_vat === null ? null : Number(p.sell_price_inc_vat),
      rulePriceIncVat: rulePrice,
      overrideIncVat: p.price_override_inc_vat === null ? null : Number(p.price_override_inc_vat),
      marginPct: live.marginPct,
      floorPct: rule?.minMarginPct ?? 0,
      marginStatus: live.marginStatus,
      stockQty: p.stock_qty,
      stockStatus: p.stock_status,
      isPublished: p.is_published ?? false,
      featured: p.featured ?? false,
      ruleLabel: ruleLabel(rule),
      lastSyncedAt: p.last_synced_at,
    };
  });
  return { rows, vatRate: settings.vatRate, rules };
}
