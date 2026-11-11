import { NextResponse, type NextRequest } from 'next/server';
import { getPublicOrder } from '@/lib/orders/public';
import { refreshOrderIfStale } from '@/lib/orders/refresh';
import { createServiceClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// GET /api/orders/[orderNumber]?token= (step 5.5). Customer-safe DTO only; wrong token → 404.
export async function GET(req: NextRequest, { params }: { params: { orderNumber: string } }) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const db = createServiceClient();
  const found = await getPublicOrder(db, decodeURIComponent(params.orderNumber), token);
  if (!found) return apiError('NOT_FOUND', 'Order not found', 404);
  // Demo nicety: viewing an order nudges the poller for it, so the page moves without cron.
  if (await refreshOrderIfStale(db, found.id)) {
    const again = await getPublicOrder(db, decodeURIComponent(params.orderNumber), token);
    if (again) return NextResponse.json(again.order, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(found.order, { headers: { 'Cache-Control': 'no-store' } });
}
