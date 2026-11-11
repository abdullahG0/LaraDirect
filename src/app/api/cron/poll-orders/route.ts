import { NextResponse } from 'next/server';
import { checkCronAuth } from '@/lib/auth/cron';
import { pollOpenOrders } from '@/lib/orders/poll';
import { createServiceClient } from '@/lib/supabase/server';
import { handle } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/cron/poll-orders (spec §8.1 step 4).
async function run(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  return NextResponse.json(await pollOpenOrders(createServiceClient()));
}

export const POST = handle(run);
export const GET = handle(run);
