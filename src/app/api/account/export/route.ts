import { NextResponse } from 'next/server';
import { exportAccountData, getOrLinkCustomer } from '@/lib/account';
import { getCurrentUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { apiError } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// GET /api/account/export: GDPR data export as a JSON download (step 8.2).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError('UNAUTHORIZED', 'Please sign in', 401);
  const db = createServiceClient();
  const customer = await getOrLinkCustomer(db, user);
  if (!customer) return apiError('NOT_FOUND', 'Account not found', 404);
  const data = await exportAccountData(db, customer.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="laradirect-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
