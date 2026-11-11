// Storefront product shape. Built only from the public_products view, so it can never carry
// cost price, margin or distributor SKU (spec §6, §14).

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued' | 'backorder';

export interface PublicProduct {
  id: string;
  slug: string;
  brand: string;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  specs: Record<string, string>;
  images: string[];
  tags: string[];
  mpn: string | null;
  priceIncVat: number;
  rrpIncVat: number | null;
  stockQty: number;
  stockStatus: StockStatus;
  eta: string | null;
  warrantyMonths: number | null;
  weightKg: number | null;
  featured: boolean;
  createdAt: string;
}

/** Slim version sent to client components (cards, suggestions). */
export type ProductSummary = Pick<
  PublicProduct,
  | 'id'
  | 'slug'
  | 'brand'
  | 'name'
  | 'category'
  | 'subcategory'
  | 'images'
  | 'priceIncVat'
  | 'rrpIncVat'
  | 'stockQty'
  | 'stockStatus'
  | 'eta'
> & { keySpecs: string };

export const SORTS = ['recommended', 'price-asc', 'price-desc', 'newest', 'name'] as const;
export type SortKey = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Recommended',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  newest: 'Newest',
  name: 'Name: A to Z',
};

export interface ListParams {
  category?: string; // database name
  subcategory?: string; // database name
  q?: string;
  brands: string[];
  subs: string[]; // subcategory filter on category pages
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  education: boolean;
  deals: boolean;
  facets: Record<string, string[]>; // facet key → selected buckets
  sort: SortKey;
  page: number;
  perPage: number;
}

export interface FacetOption {
  value: string;
  count: number;
}

export interface FacetGroup {
  key: string;
  label: string;
  options: FacetOption[];
}

export interface ListResult {
  items: ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
  perPage: number;
  facets: FacetGroup[]; // brand, type, then category-specific
  priceBounds: { min: number; max: number };
}
