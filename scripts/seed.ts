/**
 * Seeds the catalogue (step 2.3): reads every product through getDistributor() (the mock in demo
 * mode), prices it with the active pricing rules, and upserts it into `products`.
 *
 * Safe to re-run: LaraDirect overrides (title, description, price override, published) are kept,
 * because the upsert only writes distributor fields and computed prices.
 *
 * Then creates demo admin users (one per role) and ~60 sample orders (scripts/seed-demo.ts).
 *
 * Usage: npm run db:seed            (catalogue + demo users + sample orders)
 *        npm run db:seed -- --catalogue-only
 */
import { createClient } from '@supabase/supabase-js';
import { getDistributor, type DistributorProduct } from '../src/lib/distributor';
import { calculatePrice, type PricingRule } from '../src/lib/pricing/engine';
import { slugify } from '../src/lib/utils/slug';
import type { Database } from '../src/lib/supabase/types';
import { seedDemoUsers, seedSampleOrders } from './seed-demo';

// Tags used only by the mock catalogue generator. Never shown on the storefront.
const INTERNAL_TAGS = new Set(['thin-margin', 'bundle-ready']);

// Featured on the home page: one strong pick per teacher-relevant subcategory.
const FEATURED_SUBCATEGORIES = [
  'Chromebooks',
  'Windows laptops',
  'iPads',
  'Classroom headsets',
  'Document cameras',
  'Interactive displays',
  'Webcams',
  'Charging trolleys',
];

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} (add it to .env.local)`);
  return v;
}

const db = createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
    }
  }
}

async function fetchCatalogue(): Promise<DistributorProduct[]> {
  const distributor = getDistributor();
  const all: DistributorProduct[] = [];
  let cursor: string | undefined;
  do {
    const page = await withRetry(() => distributor.listProducts({ cursor, limit: 100 }));
    all.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  console.log(`Fetched ${all.length} products from ${distributor.name}`);
  return all;
}

async function loadRules(): Promise<PricingRule[]> {
  const { data, error } = await db.from('pricing_rules').select('*');
  if (error) throw error;
  return data.map((r) => ({
    id: r.id,
    scope: r.scope as PricingRule['scope'],
    scopeValue: r.scope_value,
    markupType: r.markup_type as PricingRule['markupType'],
    markupValue: Number(r.markup_value),
    minMarginPct: Number(r.min_margin_pct ?? 0),
    minMarginAmount: Number(r.min_margin_amount ?? 0),
    rounding: (r.rounding ?? 'x.99') as PricingRule['rounding'],
    priority: r.priority ?? 0,
    isActive: r.is_active ?? true,
  }));
}

async function loadVatRate(): Promise<number> {
  const { data } = await db.from('settings').select('value').eq('key', 'vat_rate').maybeSingle();
  return data ? Number(data.value) : 0.2;
}

/** SKU rules with a 1% markup for the thin-margin demo products, so the margin floor kicks in. */
async function ensureThinMarginRules(products: DistributorProduct[]) {
  const thin = products.filter((p) => p.tags?.includes('thin-margin'));
  const { data: existing } = await db.from('pricing_rules').select('scope_value').eq('scope', 'sku');
  const have = new Set((existing ?? []).map((r) => r.scope_value));
  const missing = thin.filter((p) => !have.has(p.sku));
  if (missing.length === 0) return;
  const { error } = await db.from('pricing_rules').insert(
    missing.map((p) => ({
      scope: 'sku',
      scope_value: p.sku,
      markup_type: 'percent',
      markup_value: 1,
      min_margin_pct: 3,
      priority: 0,
    })),
  );
  if (error) throw error;
  console.log(`Added ${missing.length} thin-margin SKU rules`);
}

function uniqueSlugs(products: DistributorProduct[]): Map<string, string> {
  const used = new Map<string, number>();
  const out = new Map<string, string>();
  for (const p of products) {
    const base = slugify(`${p.brand} ${p.name.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')}`);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    out.set(p.sku, n === 0 ? base : `${base}-${p.sku.slice(-4).toLowerCase()}`);
  }
  return out;
}

async function main() {
  const products = await fetchCatalogue();
  await ensureThinMarginRules(products);
  const [rules, vatRate] = await Promise.all([loadRules(), loadVatRate()]);

  // Keep existing slugs and price overrides stable across re-runs.
  const { data: existing, error: exErr } = await db
    .from('products')
    .select('distributor_sku, slug, price_override_inc_vat, sell_price_inc_vat, cost_price_ex_vat');
  if (exErr) throw exErr;
  const bySku = new Map(existing.map((e) => [e.distributor_sku, e]));
  const slugs = uniqueSlugs(products);

  const featuredSkus = new Set(
    FEATURED_SUBCATEGORIES.flatMap((sub) => {
      const pick = products.find((p) => p.subcategory === sub && p.stockStatus === 'in_stock');
      return pick ? [pick.sku] : [];
    }),
  );

  const now = new Date().toISOString();
  let belowFloor = 0;
  const history: { sku: string; cost: number; sell: number; reason: string }[] = [];

  const rows = products.map((p) => {
    const prev = bySku.get(p.sku);
    const price = calculatePrice(
      {
        sku: p.sku,
        brand: p.brand,
        category: p.category,
        costPriceExVat: p.costPriceExVat,
        priceOverrideIncVat: prev?.price_override_inc_vat ?? null,
      },
      rules,
      vatRate,
    );
    if (price.belowFloor) belowFloor++;
    if (!prev || Number(prev.sell_price_inc_vat) !== price.sellPriceIncVat) {
      history.push({
        sku: p.sku,
        cost: p.costPriceExVat,
        sell: price.sellPriceIncVat,
        reason: prev ? 'seed: reprice' : 'seed: initial price',
      });
    }
    const tags = (p.tags ?? []).filter((t) => !INTERNAL_TAGS.has(t));
    return {
      distributor_sku: p.sku,
      mpn: p.mpn,
      ean: p.ean ?? null,
      brand: p.brand,
      name: p.name,
      slug: prev?.slug ?? slugs.get(p.sku)!,
      description: p.description,
      category: p.category,
      subcategory: p.subcategory ?? null,
      specs: p.specs,
      images: p.images,
      cost_price_ex_vat: p.costPriceExVat,
      rrp_ex_vat: p.rrpExVat ?? null,
      stock_qty: p.stockQty,
      stock_status: p.stockStatus,
      eta: p.eta ?? null,
      weight_kg: p.weightKg ?? null,
      warranty_months: p.warrantyMonths ?? null,
      tags,
      featured: featuredSkus.has(p.sku),
      sell_price_ex_vat: price.sellPriceExVat,
      sell_price_inc_vat: price.sellPriceIncVat,
      margin_pct: price.marginPct,
      last_synced_at: now,
      updated_at: now,
    };
  });

  const { data: upserted, error } = await db
    .from('products')
    .upsert(rows, { onConflict: 'distributor_sku' })
    .select('id, distributor_sku');
  if (error) throw error;

  const idBySku = new Map(upserted.map((u) => [u.distributor_sku, u.id]));
  if (history.length) {
    const { error: hErr } = await db.from('price_history').insert(
      history.map((h) => ({
        product_id: idBySku.get(h.sku),
        cost_price_ex_vat: h.cost,
        sell_price_inc_vat: h.sell,
        reason: h.reason,
      })),
    );
    if (hErr) throw hErr;
  }

  const byCategory = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Upserted ${upserted.length} products, ${history.length} price history rows`);
  console.log(`Featured: ${featuredSkus.size}, below margin floor: ${belowFloor}`);
  console.table(byCategory);

  if (!process.argv.includes('--catalogue-only')) {
    await seedDemoUsers(db);
    await seedSampleOrders(db);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
