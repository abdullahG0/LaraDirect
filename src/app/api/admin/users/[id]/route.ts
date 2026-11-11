import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audit, withAdmin } from '@/lib/auth/admin';
import { ROLES, type Role } from '@/lib/auth/roles';
import { HttpError, parseBody } from '@/lib/utils/errors';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/users/[id]: change role, rename, deactivate or reactivate (owner only).
const schema = z.object({
  role: z.enum(ROLES as [Role, ...Role[]]).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAdmin<{ id: string }>('users.manage', async (req, { admin, db, params }) => {
  const body = await parseBody(req, schema);
  const { data: before } = await db.from('admin_users').select('*').eq('user_id', params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'NOT_FOUND', 'Admin user not found');
  if (params.id === admin.id && ((body.role && body.role !== 'owner') || body.isActive === false)) {
    throw new HttpError(409, 'SELF', 'You can’t remove your own owner access');
  }
  if (before.role === 'owner' && ((body.role && body.role !== 'owner') || body.isActive === false)) {
    const { count } = await db
      .from('admin_users')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('is_active', true);
    if ((count ?? 0) <= 1)
      throw new HttpError(409, 'LAST_OWNER', 'There must always be at least one active owner');
  }
  const patch = {
    ...(body.role && { role: body.role }),
    ...(body.name && { name: body.name }),
    ...(body.isActive !== undefined && { is_active: body.isActive }),
  };
  const { data: after, error } = await db
    .from('admin_users')
    .update(patch)
    .eq('user_id', params.id)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'DB', error.message);
  await audit(
    db,
    admin,
    body.isActive === false ? 'user.deactivate' : 'user.update',
    'admin_user',
    params.id,
    before,
    after,
  );
  return NextResponse.json(after);
});
