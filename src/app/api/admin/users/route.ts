import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, withAdmin } from '@/lib/auth/admin';
import { ROLES } from '@/lib/auth/roles';
import { siteUrl } from '@/lib/orders/notify';
import { HttpError, parseBody } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// POST /api/admin/users: invite an admin user (owner only, step 7.5).
const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(80),
  role: z.enum(ROLES as [string, ...string[]]),
});

export const POST = withAdmin('users.manage', async (req, { admin, db }) => {
  const body = await parseBody(req, schema);

  // Reuse an existing auth user (e.g. a customer) or send a Supabase invite email.
  let userId: string | null = null;
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  userId = list?.users.find((u) => u.email?.toLowerCase() === body.email)?.id ?? null;
  let invited = false;
  if (!userId) {
    const { data, error } = await db.auth.admin.inviteUserByEmail(body.email, {
      redirectTo: `${siteUrl()}/admin/login`,
    });
    if (error) throw new HttpError(400, 'INVITE_FAILED', `Could not send the invite: ${error.message}`);
    userId = data.user.id;
    invited = true;
  }

  const { data: existing } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) throw new HttpError(409, 'EXISTS', 'That person already has admin access');
  const { error } = await db
    .from('admin_users')
    .insert({ user_id: userId, role: body.role as never, name: body.name, is_active: true });
  if (error) throw new HttpError(500, 'DB', error.message);
  await audit(db, admin, 'user.invite', 'admin_user', userId, null, {
    email: body.email,
    role: body.role,
    name: body.name,
  });
  return NextResponse.json({ ok: true, invited });
});
