// Storefront catalogue reads (step 3.2). Reads ONLY the public_products view, never `products`,
// so cost price, margin and distributor SKU can't reach the storefront (spec §14).
import 'server-only';
import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import { categoryByName } from './categories';
import { isAvailable, isDeal, listFromCatalogue, searchScore, toSummary } from './filters';
import type { ListParams, ListResult, ProductSummary, PublicProduct, StockStatus } from './types';

export const CATALOGUE_TAG = 'catalogue';

// Every column except the search vector. Listed explicitly so new view columns are opt-in.
const COLUMNS =
  'id, slug, brand, name, description, category, subcategory, specs, images, tags, mpn, price_inc_vat, rrp_inc_vat, stock_qty, stock_status, eta, warranty_months, weight_kg, featured, created_at';

async function fetchCatalogue(): Promise<PublicProduct[]> {
  const { data, error } = await createPublicClient().from('public_products').select(COLUMNS).limit(5000);
  if (error) throw new Error(`Catalogue query failed: ${error.message}`);
  return data
    .filter((r) => r.id && r.slug && r.price_inc_vat !== null)
    .map((r) => ({
      id: r.id!,
      slug: r.slug!,
      brand: r.brand ?? '',
      name: r.name ?? '',
      description: r.description ?? '',
      category: r.category ?? '',
      subcategory: r.subcategory,
      specs: (r.specs ?? {}) as Record<string, string>,
      images: r.images ?? [],
      tags: r.tags ?? [],
      mpn: r.mpn,
      priceIncVat: Number(r.price_inc_vat),
      rrpIncVat: r.rrp_inc_vat === null ? null : Number(r.rrp_inc_vat),
      stockQty: r.stock_qty ?? 0,
      stockStatus: (r.stock_status ?? 'out_of_stock') as StockStatus,
      eta: r.eta,
      warrantyMonths: r.warranty_months,
      weightKg: r.weight_kg === null ? null : Number(r.weight_kg),
      featured: r.featured ?? false,
      createdAt: r.created_at ?? '',
    }));
}

/**
 * The whole public catalogue, cached for 60 s (and on demand via revalidateTag('catalogue')
 * after a sync or admin edit). Keeps listing and search fast regardless of database distance.
 */
export const getCatalogue = unstable_cache(fetchCatalogue, ['public-catalogue-v1'], {
  revalidate: 60,
  tags: [CATALOGUE_TAG],
});

export async function listProducts(params: ListParams): Promise<ListResult> {
  return listFromCatalogue(await getCatalogue(), params);
}

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  return (await getCatalogue()).find((p) => p.slug === slug) ?? null;
}

export async function getFeatured(limit = 8): Promise<ProductSummary[]> {
  const all = await getCatalogue();
  return all
    .filter((p) => p.featured && isAvailable(p))
    .slice(0, limit)
    .map(toSummary);
}

/** Biggest savings against RRP, in stock. */
export async function getDeals(limit = 8): Promise<ProductSummary[]> {
  const all = await getCatalogue();
  return all
    .filter((p) => isDeal(p) && isAvailable(p))
    .sort((a, b) => b.rrpIncVat! - b.priceIncVat - (a.rrpIncVat! - a.priceIncVat))
    .slice(0, limit)
    .map(toSummary);
}

/** Same subcategory, closest in price. */
export async function getSimilar(product: PublicProduct, limit = 4): Promise<ProductSummary[]> {
  const all = await getCatalogue();
  return all
    .filter(
      (p) => p.id !== product.id && p.subcategory === product.subcategory && p.stockStatus !== 'out_of_stock',
    )
    .sort(
      (a, b) => Math.abs(a.priceIncVat - product.priceIncVat) - Math.abs(b.priceIncVat - product.priceIncVat),
    )
    .slice(0, limit)
    .map(toSummary);
}

// Accessory subcategories that pair well with each product type.
const COMPANIONS: Record<string, string[]> = {
  Laptops: ['Bags and sleeves', 'Mice', 'Docks'],
  Tablets: ['Tablet cases and keyboards', 'Screen protectors', 'Chargers'],
  'Desktops & All-in-ones': ['Keyboards', 'Mice', 'Webcams'],
  'Monitors & Displays': ['Cables', 'Docks', 'Stands'],
  'Headphones & Audio': ['Hubs', 'Cables'],
  Peripherals: ['Hubs', 'Cables'],
  'Networking & Power': ['Cables', 'Chargers'],
  'Software & Accessories': ['Mice', 'Hubs'],
};

/** "Frequently bought together": one cheap, in-stock pick from each companion subcategory. */
export async function getFrequentlyBoughtTogether(
  product: PublicProduct,
  limit = 2,
): Promise<ProductSummary[]> {
  const all = await getCatalogue();
  const picks: PublicProduct[] = [];
  for (const sub of COMPANIONS[product.category] ?? []) {
    if (sub === product.subcategory) continue;
    const pick = all
      .filter((p) => p.subcategory === sub && isAvailable(p))
      // Prefer accessories that mention this product's brand or type (e.g. an iPad case for an iPad).
      .sort(
        (a, b) =>
          Number(b.name.includes(product.brand)) - Number(a.name.includes(product.brand)) ||
          a.priceIncVat - b.priceIncVat,
      )[0];
    if (pick) picks.push(pick);
    if (picks.length >= limit) break;
  }
  return picks.map(toSummary);
}

export interface Suggestions {
  products: ProductSummary[];
  categories: { label: string; href: string }[];
}

export async function suggest(q: string, limit = 6): Promise<Suggestions> {
  const term = q.trim();
  if (term.length < 2) return { products: [], categories: [] };
  const all = await getCatalogue();
  const scored = all
    .map((p) => ({ p, score: searchScore(p, term) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Number(isAvailable(b.p)) - Number(isAvailable(a.p)));
  const catCounts = new Map<string, number>();
  for (const { p } of scored) catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1);
  const categories = [...catCounts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .flatMap(([name]) => {
      const cat = categoryByName(name);
      return cat ? [{ label: cat.label, href: `/c/${cat.slug}?q=${encodeURIComponent(term)}` }] : [];
    });
  return { products: scored.slice(0, limit).map((x) => toSummary(x.p)), categories };
}

/** Product counts per category, for navigation and the home page tiles. */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const p of await getCatalogue()) counts[p.category] = (counts[p.category] ?? 0) + 1;
  return counts;
}
