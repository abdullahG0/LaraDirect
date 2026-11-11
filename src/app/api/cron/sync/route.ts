import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { checkCronAuth } from '@/lib/auth/cron';
import { CATALOGUE_TAG } from '@/lib/catalogue/queries';
import { distributorFor } from '@/lib/services/distributor';
import { createServiceClient } from '@/lib/supabase/server';
import { syncCatalogue } from '@/lib/sync/catalogue-sync';
import { handle } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/cron/sync (spec §9). GET is accepted too, because Vercel Cron sends GET requests.
async function run(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;
  const db = createServiceClient();
  const result = await syncCatalogue(db, await distributorFor(db), { type: 'scheduled' });
  revalidateTag(CATALOGUE_TAG);
  return NextResponse.json(result);
}

export const POST = handle(run);
export const GET = handle(run);
