// Admin guards (step 6.1). Middleware is only the first gate: every admin page calls
// requireAdminPage() and every admin API handler is wrapped in withAdmin() (spec §14).
import 'server-only';
import { redirect } from 'next/navigation';
import type { Db, Json } from '@/lib/supabase/db';
import { createServiceClient } from '@/lib/supabase/server';
import { apiError, HttpError } from '@/lib/utils/errors';
import { getCurrentUser } from './session';
import { can, hasRole, type Permission, type Role } from './roles';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await createServiceClient()
    .from('admin_users')
    .select('role, name, is_active')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  return { id: user.id, email: user.email, name: data.name, role: data.role as Role };
}

/** For server components: redirects to login, or to the forbidden page if the role is too low. */
export async function requireAdminPage(min: Role = 'viewer'): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin.role, min)) redirect('/admin/forbidden');
  return admin;
}

export interface AdminContext {
  admin: AdminUser;
  db: Db;
}

/**
 * Wraps an admin route handler: 401 when signed out, 403 when the role is too low, standard
 * error shape for thrown HttpErrors. The handler gets the admin and a service-role client.
 */
export function withAdmin<P = unknown>(
  min: Role | Permission,
  handler: (req: Request, ctx: AdminContext & { params: P }) => Promise<Response>,
) {
  return async (req: Request, route: { params: P }): Promise<Response> => {
    try {
      const admin = await getAdminUser();
      if (!admin) return apiError('UNAUTHORIZED', 'Please sign in', 401);
      const allowed = min.includes('.')
        ? can(admin.role, min as Permission)
        : hasRole(admin.role, min as Role);
      if (!allowed) return apiError('FORBIDDEN', 'Your role does not allow this action', 403);
      return await handler(req, { admin, db: createServiceClient(), params: route?.params });
    } catch (err) {
      if (err instanceof HttpError) return apiError(err.code, err.message, err.status);
      console.error(err);
      return apiError('INTERNAL', (err as Error).message || 'Something went wrong', 500);
    }
  };
}

/** Writes an audit_log row (spec §11.1 Audit log: who, when, before and after). */
export async function audit(
  db: Db,
  admin: Pick<AdminUser, 'id'> | null,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown = null,
  after: unknown = null,
): Promise<void> {
  const { error } = await db.from('audit_log').insert({
    actor: admin?.id ?? null,
    action,
    entity,
    entity_id: entityId,
    before: before as Json,
    after: after as Json,
  });
  if (error) console.error(`audit write failed: ${error.message}`);
}

export const actorLabel = (a: AdminUser) => `admin:${a.name ?? a.email}`;
