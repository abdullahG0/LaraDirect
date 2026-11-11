// Catalogue sync (spec §9, step 2.6).
//   1. Mock mode: tick() first, so every run shows realistic drift.
//   2. List products from the distributor and upsert distributor fields (LaraDirect overrides kept).
//   3. Live price/stock for published products in batches of 50; record changes.
//   4. Re-price changed products (writes price_history).
//   5. Products missing from the feed → discontinued; unpublished after a grace period.
//   6. One sync_runs row with counts, errors and a short log.
import { mockControls, type Distributor, type DistributorProduct, type PriceStock } from '@/lib/distributor';
import type { Db, Json, ProductUpdate } from '@/lib/supabase/db';
import { must } from '@/lib/supabase/db';
import { recalculate } from '@/lib/pricing/rules';
import { slugify } from '@/lib/utils/slug';

export type SyncType = 'scheduled' | 'manual' | 'category' | 'product';

export interface SyncOptions {
  type: SyncType;
  category?: string;
  sku?: string;
  actor?: string | null;
  /** How long a product may be missing from the feed before it's unpublished. */
  graceHours?: number;
  now?: () => Date;
}

export interface SyncResult {
  runId: string | null;
  productsSeen: number;
  productsChanged: number;
  priceChanges: number;
  stockChanges: number;
  newProducts: number;
  discontinued: number;
  errors: number;
  log: string[];
}

// Tags used only by the mock catalogue generator; never stored for the storefront.
const INTERNAL_TAGS = new Set(['thin-margin', 'bundle-ready']);
const BATCH = 50;

interface ExistingRow {
  id: string;
  distributor_sku: string;
  slug: string;
  category: string;
  cost_price_ex_vat: number;
  stock_qty: number;
  stock_status: string;
  eta: string | null;
  is_published: boolean | null;
  missing_since: string | null;
}

async function loadExisting(db: Db, opts: SyncOptions): Promise<ExistingRow[]> {
  const out: ExistingRow[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db
      .from('products')
      .select(
        'id, distributor_sku, slug, category, cost_price_ex_vat, stock_qty, stock_status, eta, is_published, missing_since',
      )
      .order('id')
      .range(from, from + 999);
    if (opts.category) q = q.eq('category', opts.category);
    if (opts.sku) q = q.eq('distributor_sku', opts.sku);
    const rows = must(await q, 'load products for sync') as unknown as ExistingRow[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function fetchFeed(d: Distributor, opts: SyncOptions): Promise<DistributorProduct[]> {
  if (opts.sku) {
    const p = await d.getProduct(opts.sku);
    return p ? [p] : [];
  }
  // A full listing each run: the mock is cheap, and a complete feed is needed to spot products
  // that have disappeared. With the real API, switch to `updatedSince` plus a nightly full run.
  const all: DistributorProduct[] = [];
  let cursor: string | undefined;
  do {
    const page = await withRetry(() => d.listProducts({ cursor, limit: 200, category: opts.category }));
    all.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return all;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = (err as { retryable?: boolean }).retryable;
      if (!retryable || i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 200 * i));
    }
  }
}

function uniqueSlug(p: DistributorProduct, taken: Set<string>): string {
  const base = slugify(`${p.brand} ${p.name.replace(new RegExp(`^${p.brand}\\s+`, 'i'), '')}`);
  let slug = taken.has(base) ? `${base}-${p.sku.slice(-4).toLowerCase()}` : base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

export async function syncCatalogue(db: Db, d: Distributor, opts: SyncOptions): Promise<SyncResult> {
  const now = opts.now ?? (() => new Date());
  const graceMs = (opts.graceHours ?? 48) * 3600_000;
  const result: SyncResult = {
    runId: null,
    productsSeen: 0,
    productsChanged: 0,
    priceChanges: 0,
    stockChanges: 0,
    newProducts: 0,
    discontinued: 0,
    errors: 0,
    log: [],
  };
  const log = (line: string) => result.log.push(`${new Date().toISOString().slice(11, 19)} ${line}`);

  const run = await db
    .from('sync_runs')
    .insert({
      type: opts.sku ? `product:${opts.sku}` : opts.category ? `category:${opts.category}` : opts.type,
    })
    .select('id')
    .single();
  result.runId = run.data?.id ?? null;

  try {
    const mock = mockControls(d);
    if (mock && opts.type !== 'product') {
      const t = await mock.tick();
      log(`mock tick: ${t.priceChanges} cost changes, ${t.stockChanges} stock changes`);
    }

    const [feed, existing] = await Promise.all([fetchFeed(d, opts), loadExisting(db, opts)]);
    result.productsSeen = feed.length;
    log(`feed: ${feed.length} products from ${d.name}`);

    const bySku = new Map(existing.map((e) => [e.distributor_sku, e]));
    const changedIds = new Set<string>();
    const nowIso = now().toISOString();

    // ── 2. Upsert distributor fields ─────────────────────────────────────────
    const { data: slugRows } = await db.from('products').select('slug');
    const taken = new Set((slugRows ?? []).map((r) => r.slug));
    const upserts = feed.map((p) => {
      const prev = bySku.get(p.sku);
      if (!prev) result.newProducts++;
      return {
        distributor_sku: p.sku,
        mpn: p.mpn,
        ean: p.ean ?? null,
        brand: p.brand,
        name: p.name,
        slug: prev?.slug ?? uniqueSlug(p, taken),
        description: p.description,
        category: p.category,
        subcategory: p.subcategory ?? null,
        specs: p.specs as Json,
        images: p.images,
        rrp_ex_vat: p.rrpExVat ?? null,
        weight_kg: p.weightKg ?? null,
        warranty_months: p.warrantyMonths ?? null,
        tags: (p.tags ?? []).filter((t) => !INTERNAL_TAGS.has(t)),
        // Price/stock come from the live check below; new products take the feed values.
        cost_price_ex_vat: prev ? Number(prev.cost_price_ex_vat) : p.costPriceExVat,
        stock_qty: prev ? prev.stock_qty : p.stockQty,
        stock_status: (prev ? prev.stock_status : p.stockStatus) as DistributorProduct['stockStatus'],
        missing_since: null,
        last_synced_at: nowIso,
      };
    });
    for (let i = 0; i < upserts.length; i += 200) {
      const rows = must(
        await db
          .from('products')
          .upsert(upserts.slice(i, i + 200), { onConflict: 'distributor_sku' })
          .select('id, distributor_sku'),
        'upsert products',
      );
      for (const r of rows) {
        if (!bySku.has(r.distributor_sku)) changedIds.add(r.id);
      }
    }
    if (result.newProducts) log(`new products: ${result.newProducts}`);

    // ── 3. Live price and stock in batches of 50 ────────────────────────────
    const feedSkus = new Set(feed.map((p) => p.sku));
    const live = existing.filter((e) => feedSkus.has(e.distributor_sku) && e.is_published !== false);
    const fresh: PriceStock[] = [];
    for (let i = 0; i < live.length; i += BATCH) {
      const skus = live.slice(i, i + BATCH).map((e) => e.distributor_sku);
      try {
        fresh.push(...(await withRetry(() => d.getPriceStock(skus))));
      } catch (err) {
        result.errors++;
        log(`price/stock batch ${i / BATCH + 1} failed: ${(err as Error).message}`);
      }
    }

    const updates: { id: string; patch: ProductUpdate }[] = [];
    for (const ps of fresh) {
      const prev = bySku.get(ps.sku)!;
      const patch: ProductUpdate = {};
      if (Number(prev.cost_price_ex_vat) !== ps.costPriceExVat) {
        patch.cost_price_ex_vat = ps.costPriceExVat;
        result.priceChanges++;
        changedIds.add(prev.id);
      }
      if (prev.stock_qty !== ps.stockQty || prev.stock_status !== ps.stockStatus) {
        patch.stock_qty = ps.stockQty;
        patch.stock_status = ps.stockStatus;
        result.stockChanges++;
      }
      if ((prev.eta ?? null) !== (ps.eta ?? null)) patch.eta = ps.eta ?? null;
      if (Object.keys(patch).length) updates.push({ id: prev.id, patch: { ...patch, updated_at: nowIso } });
    }
    for (let i = 0; i < updates.length; i += 25) {
      await Promise.all(
        updates.slice(i, i + 25).map(async (u) => {
          const { error } = await db.from('products').update(u.patch).eq('id', u.id);
          if (error) {
            result.errors++;
            log(`update ${u.id} failed: ${error.message}`);
          }
        }),
      );
    }
    result.productsChanged = updates.length + result.newProducts;
    log(`price changes: ${result.priceChanges}, stock changes: ${result.stockChanges}`);

    // ── 4. Re-price products whose cost changed ─────────────────────────────
    if (changedIds.size) {
      const r = await recalculate(db, {
        productIds: [...changedIds],
        reason: 'sync: cost change',
        actor: opts.actor,
      });
      log(`repriced ${r.checked} products, ${r.changed} prices changed, ${r.belowFloor} below floor`);
    }

    // ── 5. Missing from the feed → discontinued, unpublished after grace ────
    if (!opts.sku) {
      const missing = existing.filter((e) => !feedSkus.has(e.distributor_sku));
      for (const m of missing) {
        const since = m.missing_since ? new Date(m.missing_since).getTime() : now().getTime();
        const patch: ProductUpdate = { stock_status: 'discontinued', stock_qty: 0 };
        if (!m.missing_since) patch.missing_since = nowIso;
        if (now().getTime() - since >= graceMs && m.is_published) patch.is_published = false;
        if (m.stock_status !== 'discontinued' || !m.missing_since || patch.is_published === false) {
          await db.from('products').update(patch).eq('id', m.id);
          result.discontinued++;
        }
      }
      if (result.discontinued) log(`missing from feed: ${result.discontinued} marked discontinued`);
    } else if (feed.length === 0) {
      result.errors++;
      log(`SKU ${opts.sku} not found at the distributor`);
    }
  } catch (err) {
    result.errors++;
    log(`sync failed: ${(err as Error).message}`);
  }

  if (result.runId) {
    await db
      .from('sync_runs')
      .update({
        finished_at: new Date().toISOString(),
        products_seen: result.productsSeen,
        products_changed: result.productsChanged,
        price_changes: result.priceChanges,
        stock_changes: result.stockChanges,
        errors: result.errors,
        log: result.log.join('\n'),
      })
      .eq('id', result.runId);
  }
  return result;
}
