// Pure filtering, faceting, sorting and paging over storefront products.
// No I/O, so it is unit-tested directly and shared by pages and API routes.
//
// Demo note: this runs in memory over the cached catalogue (~200 products). With a full
// distributor catalogue, move these filters into SQL; the ListParams/ListResult contract stays.
import { categoryByName, type FacetDef } from './categories';
import { keySpecLine } from './format';
import {
  SORTS,
  type FacetGroup,
  type ListParams,
  type ListResult,
  type ProductSummary,
  type PublicProduct,
  type SortKey,
} from './types';

export const PER_PAGE = 24;
export const RESERVED_PARAMS = new Set([
  'q',
  'brand',
  'type',
  'min',
  'max',
  'stock',
  'edu',
  'sort',
  'page',
  'view',
]);

type SearchParams = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
const first = (v: string | string[] | undefined) => list(v)[0];
const num = (v: string | undefined) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Reads filters from the URL. Unknown or malformed values are ignored, never thrown. */
export function parseListParams(
  sp: SearchParams,
  base: Partial<Pick<ListParams, 'category' | 'subcategory' | 'deals'>> = {},
): ListParams {
  const sort = first(sp.sort);
  const page = Math.max(1, Math.floor(num(first(sp.page)) ?? 1));
  const facets: Record<string, string[]> = {};
  const cat = base.category ? categoryByName(base.category) : undefined;
  for (const f of cat?.facets ?? []) {
    const v = list(sp[f.key]);
    if (v.length) facets[f.key] = v;
  }
  return {
    ...base,
    deals: base.deals ?? false,
    q: first(sp.q)?.trim().slice(0, 100) || undefined,
    brands: list(sp.brand),
    subs: list(sp.type),
    minPrice: num(first(sp.min)),
    maxPrice: num(first(sp.max)),
    inStock: first(sp.stock) === '1',
    education: first(sp.edu) === '1',
    facets,
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : 'recommended',
    page,
    perPage: PER_PAGE,
  };
}

// ── Search ──────────────────────────────────────────────────────────────────

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/["″]/g, ' inch ')
    .replace(/[^a-z0-9.+]+/g, ' ');

const stem = (t: string) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);

/** 0 = no match. Every word must match; name and brand hits rank higher. */
export function searchScore(p: PublicProduct, q: string): number {
  const tokens = normalise(q).split(' ').filter(Boolean).map(stem);
  if (!tokens.length) return 0;
  const name = normalise(`${p.brand} ${p.name}`);
  const rest = normalise(`${p.category} ${p.subcategory ?? ''} ${p.tags.join(' ')} ${p.mpn ?? ''}`);
  let score = 0;
  for (const t of tokens) {
    if (name.includes(t)) score += name.split(' ').includes(t) ? 3 : 2;
    else if (rest.includes(t)) score += 1;
    else return 0;
  }
  return score;
}

// ── Filtering and facets ────────────────────────────────────────────────────

export const isAvailable = (p: Pick<PublicProduct, 'stockStatus'>) =>
  p.stockStatus === 'in_stock' || p.stockStatus === 'low_stock';

export const isDeal = (p: Pick<PublicProduct, 'rrpIncVat' | 'priceIncVat'>) =>
  p.rrpIncVat !== null && p.rrpIncVat >= p.priceIncVat * 1.05;

type Predicate = (p: PublicProduct) => boolean;

function facetDefs(params: ListParams): FacetDef[] {
  return params.category ? (categoryByName(params.category)?.facets ?? []) : [];
}

/** Named predicates, so each facet's counts can ignore its own selection. */
function predicates(params: ListParams): Record<string, Predicate> {
  const preds: Record<string, Predicate> = {};
  if (params.category) preds.category = (p) => p.category === params.category;
  if (params.subcategory) preds.subcategory = (p) => p.subcategory === params.subcategory;
  if (params.q) {
    const q = params.q;
    preds.q = (p) => searchScore(p, q) > 0;
  }
  if (params.deals) preds.deals = isDeal;
  if (params.inStock) preds.stock = isAvailable;
  if (params.education) preds.edu = (p) => p.tags.includes('education');
  if (params.minPrice !== undefined) {
    const min = params.minPrice;
    preds.min = (p) => p.priceIncVat >= min;
  }
  if (params.maxPrice !== undefined) {
    const max = params.maxPrice;
    preds.max = (p) => p.priceIncVat <= max;
  }
  if (params.brands.length) preds.brand = (p) => params.brands.includes(p.brand);
  if (params.subs.length) preds.type = (p) => params.subs.includes(p.subcategory ?? '');
  for (const f of facetDefs(params)) {
    const selected = params.facets[f.key];
    if (selected?.length) preds[`f:${f.key}`] = (p) => selected.includes(f.bucket(p.specs) ?? '');
  }
  return preds;
}

const applyAll = (items: PublicProduct[], preds: Record<string, Predicate>, skip?: string) => {
  const active = Object.entries(preds).filter(([k]) => k !== skip);
  return items.filter((p) => active.every(([, fn]) => fn(p)));
};

function countBy(items: PublicProduct[], fn: (p: PublicProduct) => string | null) {
  const counts = new Map<string, number>();
  for (const p of items) {
    const v = fn(p);
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

const leadingNumber = (s: string) => {
  const m = s.match(/[\d.]+/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Number(m[0]) * (/TB/.test(s) ? 1024 : 1);
};

function toOptions(
  counts: Map<string, number>,
  selected: string[],
  order: 'numeric' | 'alpha' | 'count' = 'alpha',
) {
  // Keep selected values visible even if they now match nothing, so they can be unticked.
  for (const s of selected) if (!counts.has(s)) counts.set(s, 0);
  const options = [...counts].map(([value, count]) => ({ value, count }));
  if (order === 'numeric') options.sort((a, b) => leadingNumber(a.value) - leadingNumber(b.value));
  else if (order === 'count') options.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  else options.sort((a, b) => a.value.localeCompare(b.value));
  return options;
}

function buildFacets(
  all: PublicProduct[],
  params: ListParams,
  preds: Record<string, Predicate>,
): FacetGroup[] {
  const groups: FacetGroup[] = [];
  if (params.category && !params.subcategory) {
    const cat = categoryByName(params.category);
    const counts = countBy(applyAll(all, preds, 'type'), (p) => p.subcategory);
    const options = toOptions(counts, params.subs);
    // Keep the category's own ordering for product types.
    const orderOf = (v: string) => cat?.subcategories.findIndex((s) => s.name === v) ?? 0;
    options.sort((a, b) => orderOf(a.value) - orderOf(b.value));
    if (options.length > 1) groups.push({ key: 'type', label: 'Product type', options });
  }
  groups.push({
    key: 'brand',
    label: 'Brand',
    options: toOptions(
      countBy(applyAll(all, preds, 'brand'), (p) => p.brand),
      params.brands,
    ),
  });
  for (const f of facetDefs(params)) {
    const counts = countBy(applyAll(all, preds, `f:${f.key}`), (p) => f.bucket(p.specs));
    const options = toOptions(counts, params.facets[f.key] ?? [], f.order);
    if (options.length > 0) groups.push({ key: f.key, label: f.label, options });
  }
  return groups;
}

// ── Sorting ─────────────────────────────────────────────────────────────────

const STOCK_RANK: Record<PublicProduct['stockStatus'], number> = {
  in_stock: 0,
  low_stock: 0,
  backorder: 1,
  out_of_stock: 2,
  discontinued: 3,
};

function sortItems(items: PublicProduct[], sort: SortKey, q?: string) {
  const byName = (a: PublicProduct, b: PublicProduct) => a.name.localeCompare(b.name);
  const sorted = [...items];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.priceIncVat - b.priceIncVat || byName(a, b));
    case 'price-desc':
      return sorted.sort((a, b) => b.priceIncVat - a.priceIncVat || byName(a, b));
    case 'newest':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b));
    case 'name':
      return sorted.sort(byName);
    case 'recommended':
    default:
      // Search relevance first (when searching), then available stock, featured, education picks.
      return sorted.sort(
        (a, b) =>
          (q ? searchScore(b, q) - searchScore(a, q) : 0) ||
          STOCK_RANK[a.stockStatus] - STOCK_RANK[b.stockStatus] ||
          Number(b.featured) - Number(a.featured) ||
          Number(b.tags.includes('education')) - Number(a.tags.includes('education')) ||
          byName(a, b),
      );
  }
}

// ── Public entry points ─────────────────────────────────────────────────────

export function toSummary(p: PublicProduct): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    brand: p.brand,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory,
    images: p.images.slice(0, 1),
    priceIncVat: p.priceIncVat,
    rrpIncVat: p.rrpIncVat,
    stockQty: p.stockQty,
    stockStatus: p.stockStatus,
    eta: p.eta,
    keySpecs: keySpecLine(p),
  };
}

export function listFromCatalogue(all: PublicProduct[], params: ListParams): ListResult {
  const preds = predicates(params);
  const filtered = applyAll(all, preds);
  const sorted = sortItems(filtered, params.sort, params.q);
  const pageCount = Math.max(1, Math.ceil(sorted.length / params.perPage));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * params.perPage;

  // Price bounds come from everything except the price filter itself, so the slider range is stable.
  const priceScope = applyAll(applyAll(all, preds, 'min'), preds, 'max');
  const prices = priceScope.map((p) => p.priceIncVat);

  return {
    items: sorted.slice(start, start + params.perPage).map(toSummary),
    total: sorted.length,
    page,
    pageCount,
    perPage: params.perPage,
    facets: buildFacets(all, params, preds),
    priceBounds: {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    },
  };
}

/** Builds a URL for the same listing with some params changed. `null` removes a param. */
export function withParams(
  pathname: string,
  current: SearchParams,
  changes: Record<string, string | string[] | null>,
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (k in changes) continue;
    for (const item of list(v)) usp.append(k, item);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) continue;
    for (const item of Array.isArray(v) ? v : [v]) usp.append(k, item);
  }
  // Any filter change returns to page 1 unless the page itself is being set.
  if (!('page' in changes)) usp.delete('page');
  const qs = usp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
