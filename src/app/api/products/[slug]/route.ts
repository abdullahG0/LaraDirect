import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProductBySlug } from '@/lib/catalogue/queries';
import { apiError } from '@/lib/utils/errors';

const Slug = z.string().regex(/^[a-z0-9-]{1,160}$/);

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = Slug.safeParse(params.slug);
  if (!slug.success) return apiError('VALIDATION', 'Invalid product slug');
  const product = await getProductBySlug(slug.data);
  if (!product) return apiError('NOT_FOUND', 'Product not found', 404);
  return NextResponse.json(product);
}
