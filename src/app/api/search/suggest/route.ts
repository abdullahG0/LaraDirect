import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { suggest } from '@/lib/catalogue/queries';
import { apiError } from '@/lib/utils/errors';

const Query = z.object({ q: z.string().trim().max(100).default('') });

export async function GET(req: NextRequest) {
  const parsed = Query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return apiError('VALIDATION', 'Search term must be 100 characters or fewer');
  const result = await suggest(parsed.data.q);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
  });
}
