import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteAccount, getOrLinkCustomer } from '@/lib/account';
import { getCurrentUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { HttpError, handle, parseBody } from '@/lib/utils/errors';
import { clientIp, rateLimit } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/account/delete { confirm: "DELETE" }: GDPR erasure (step 8.2).
export const POST = handle(async (req: Request) => {
  if (!rateLimit(`acct-delete:${clientIp(req)}`, 5, 60 * 60_000).ok)
    throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts');
  await parseBody(
    req,
    z.object({ confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm' }) }) }),
  );
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Please sign in');
  const db = createServiceClient();
  const { data: isAdmin } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (isAdmin)
    throw new HttpError(409, 'ADMIN', 'Admin accounts must be removed by the owner from the admin area');
  const customer = await getOrLinkCustomer(db, user);
  if (!customer) throw new HttpError(404, 'NOT_FOUND', 'Account not found');
  await deleteAccount(db, customer.id, user.id);
  return NextResponse.json({ ok: true });
});
