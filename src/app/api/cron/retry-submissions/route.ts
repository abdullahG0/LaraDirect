import { NextResponse } from 'next/server';
import { checkCronAuth } from '@/lib/auth/cron';
import { processDueSubmissions } from '@/lib/orders/submit';
import { createServiceClient } from '@/lib/supabase/server';
import { handle } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/cron/retry-submissions (step 5.2): paid orders not yet submitted, and due retries.
async function run(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  return NextResponse.json(await processDueSubmissions(createServiceClient()));
}

export const POST = handle(run);
export const GET = handle(run);
