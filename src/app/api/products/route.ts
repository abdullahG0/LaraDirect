import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { categoryBySlug } from '@/lib/catalogue/categories';
import { parseListParams } from '@/lib/catalogue/filters';
import { listProducts } from '@/lib/catalogue/queries';
import { SORTS } from '@/lib/catalogue/types';
import { apiError } from '@/lib/utils/errors';

// GET /api/products: same filters as the listing pages' URLs, plus `category` (slug) and `sub` (slug).
const Query = z.object({
  category: z.string().max(60).optional(),
  sub: z.string().max(60).optional(),
  q: z.string().max(100).optional(),
  sort: z.enum(SORTS).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  min: z.coerce.number().min(0).optional(),
  max: z.coerce.number().min(0).optional(),
  stock: z.enum(['1']).optional(),
  edu: z.enum(['1']).optional(),
});

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const single = Object.fromEntries([...sp.keys()].map((k) => [k, sp.get(k) ?? undefined]));
  const parsed = Query.safeParse(single);
  if (!parsed.success) return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid query');

  const cat = parsed.data.category ? categoryBySlug(parsed.data.category) : undefined;
  if (parsed.data.category && !cat) return apiError('NOT_FOUND', 'Unknown category', 404);
  const sub = cat && parsed.data.sub ? cat.subcategories.find((s) => s.slug === parsed.data.sub) : undefined;
  if (parsed.data.sub && !sub) return apiError('NOT_FOUND', 'Unknown subcategory', 404);

  // Multi-value filters (brand, type, facets) come straight from the query string.
  const multi: Record<string, string[]> = {};
  sp.forEach((v, k) => {
    (multi[k] ??= []).push(v);
  });
  const params = parseListParams(multi, { category: cat?.name, subcategory: sub?.name });
  return NextResponse.json(await listProducts(params));
}
