// Generates data/mock-catalogue.json deterministically from templates (spec §5.6).
// Usage: npm run gen:catalogue   (seed from CATALOGUE_SEED, default "laradirect-2026")
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRng } from '../src/lib/utils/rng';
import { round2 } from '../src/lib/utils/money';
import type { StockStatus } from '../src/lib/distributor/types';
import type { MockCatalogueItem } from '../src/lib/distributor/mock/catalogue-types';
import {
  BRAND_CODES,
  CATEGORY_TARGETS,
  TEMPLATES,
  rrpUplift,
  type Axis,
  type Template,
} from './catalogue/templates';
import { buildDescription } from './catalogue/descriptions';

const SEED = process.env.CATALOGUE_SEED ?? 'laradirect-2026';
const UPDATED_AT = '2026-11-01T08:00:00.000Z';
const rng = createRng(SEED);

const BIG_ITEM_CATEGORIES = new Set(['Laptops', 'Tablets', 'Desktops & All-in-ones', 'Monitors & Displays']);

type Choice = { axis: Axis; label: string; cost: number };

function combos(axes: Axis[]): Choice[][] {
  return axes.reduce<Choice[][]>(
    (acc, axis) => acc.flatMap((c) => axis.options.map(([label, cost]) => [...c, { axis, label, cost }])),
    [[]],
  );
}

/** Pick `count` items spread evenly across the list, so variants cover the range. */
function spread<T>(list: T[], count: number): T[] {
  if (count > list.length) throw new Error(`count ${count} exceeds ${list.length} combinations`);
  if (count === list.length) return list;
  return Array.from(
    { length: count },
    (_, i) => list[Math.round((i * (list.length - 1)) / Math.max(1, count - 1))]!,
  );
}

const usedSkus = new Set<string>();
function makeSku(brand: string): string {
  const code = BRAND_CODES[brand] ?? brand.slice(0, 3).toUpperCase();
  for (;;) {
    const sku = `TDS-${code}-${rng.int(1_000_000, 9_999_999)}`;
    if (!usedSkus.has(sku)) {
      usedSkus.add(sku);
      return sku;
    }
  }
}

function makeMpn(): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const N = '0123456789';
  const pick = (s: string, n: number) =>
    Array.from({ length: n }, () => s[rng.int(0, s.length - 1)]).join('');
  return `${pick(A, 2)}${pick(N, 4)}${pick(A, 2)}#UK`;
}

function makeEan(): string {
  const digits = [5, 0, ...Array.from({ length: 10 }, () => rng.int(0, 9))];
  const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
  return [...digits, (10 - (sum % 10)) % 10].join('');
}

function statusForQty(qty: number): StockStatus {
  if (qty <= 0) return 'out_of_stock';
  if (qty <= 5) return 'low_stock';
  return 'in_stock';
}

function imageCount(category: string): number {
  if (BIG_ITEM_CATEGORIES.has(category)) return rng.int(3, 4);
  if (category === 'Headphones & Audio') return rng.int(2, 3);
  return rng.int(1, 2);
}

function expand(t: Template): MockCatalogueItem[] {
  const variants = spread(combos(t.axes ?? []), t.count);
  return variants.map((variant, i) => {
    const specs: Record<string, string> = { ...t.specs };
    let cost = t.baseCost;
    const nameParts: string[] = [];
    for (const v of variant) {
      specs[v.axis.key] = v.label.replace(/^for /, '');
      cost += v.cost;
      if (v.axis.inName !== false) nameParts.push(v.label);
    }
    cost = round2(cost * (0.97 + rng.next() * 0.06));
    const [lo, hi] = rrpUplift(t.category, t.brand);
    const rrp = round2(cost * (1 + lo + rng.next() * (hi - lo)));
    const sku = makeSku(t.brand);
    const qty = BIG_ITEM_CATEGORIES.has(t.category) ? rng.int(8, 140) : rng.int(25, 400);
    const name = [`${t.brand} ${t.series}`, ...nameParts].join(', ');
    const n = imageCount(t.category);
    const bundle = Boolean(t.bundleFor) && i === 0;

    const item: MockCatalogueItem = {
      sku,
      mpn: makeMpn(),
      ean: makeEan(),
      brand: t.brand,
      name,
      description: buildDescription(rng, t.category, t.subcategory, specs),
      category: t.category,
      subcategory: t.subcategory,
      specs,
      images: Array.from({ length: n }, (_, k) => `/products/${sku}-${k + 1}.webp`),
      costPriceExVat: cost,
      rrpExVat: rrp,
      stockQty: qty,
      stockStatus: statusForQty(qty),
      weightKg: t.weightKg,
      warrantyMonths: t.warrantyMonths,
      tags: [...new Set([...t.tags, ...(bundle ? ['bundle-ready'] : [])])],
      updatedAt: UPDATED_AT,
      mock: { kind: t.kind, flags: bundle ? ['bundle-ready'] : [] },
    };
    if (bundle) item.mock.bundleFor = t.bundleFor;
    return item;
  });
}

const items = TEMPLATES.flatMap(expand);

// ── Edge cases (spec §5.6) ──────────────────────────────────────────────────
const taken = new Set<string>(items.filter((p) => p.mock.flags.length).map((p) => p.sku));
function pickEdge(n: number, filter: (p: MockCatalogueItem) => boolean): MockCatalogueItem[] {
  const pool = items.filter((p) => !taken.has(p.sku) && filter(p));
  const out: MockCatalogueItem[] = [];
  while (out.length < n && pool.length) {
    const p = pool.splice(rng.int(0, pool.length - 1), 1)[0]!;
    taken.add(p.sku);
    out.push(p);
  }
  if (out.length < n) throw new Error('Not enough products for edge cases');
  return out;
}
const notLicence = (p: MockCatalogueItem) => p.mock.kind !== 'licence';

for (const p of pickEdge(5, notLicence)) {
  p.stockQty = 0;
  p.stockStatus = 'out_of_stock';
  p.mock.flags.push('perma-oos');
}
for (const p of pickEdge(5, notLicence)) {
  p.stockQty = rng.int(1, 3);
  p.stockStatus = 'low_stock';
}
for (const p of pickEdge(3, (p) => BIG_ITEM_CATEGORIES.has(p.category))) {
  p.stockQty = 0;
  p.stockStatus = 'backorder';
  p.mock.etaDays = rng.int(10, 35);
}
for (const p of pickEdge(2, notLicence)) {
  p.stockQty = 0;
  p.stockStatus = 'discontinued';
}
for (const p of pickEdge(3, (p) => ['Laptops', 'Tablets'].includes(p.category) && p.brand !== 'Apple')) {
  p.rrpExVat = round2(p.costPriceExVat * 1.01);
  p.mock.flags.push('thin-margin');
  p.tags = [...(p.tags ?? []), 'thin-margin'];
}

// ── Validate and write ──────────────────────────────────────────────────────
const byCategory = items.reduce<Record<string, number>>((acc, p) => {
  acc[p.category] = (acc[p.category] ?? 0) + 1;
  return acc;
}, {});
for (const [cat, target] of Object.entries(CATEGORY_TARGETS)) {
  if (byCategory[cat] !== target) throw new Error(`${cat}: expected ${target}, got ${byCategory[cat] ?? 0}`);
}

const out = path.resolve(__dirname, '..', 'data', 'mock-catalogue.json');
writeFileSync(out, JSON.stringify(items, null, 2) + '\n');

const count = (f: (p: MockCatalogueItem) => boolean) => items.filter(f).length;
console.log(`Wrote ${items.length} products to data/mock-catalogue.json (seed "${SEED}")`);
console.table(byCategory);
console.log({
  outOfStock: count((p) => p.stockStatus === 'out_of_stock'),
  lowStock: count((p) => p.stockStatus === 'low_stock'),
  backorder: count((p) => p.stockStatus === 'backorder'),
  discontinued: count((p) => p.stockStatus === 'discontinued'),
  thinMargin: count((p) => p.mock.flags.includes('thin-margin')),
  bundleReady: count((p) => p.mock.flags.includes('bundle-ready')),
  images: items.reduce((s, p) => s + p.images.length, 0),
});
