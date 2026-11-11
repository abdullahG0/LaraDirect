import { PageHeader } from '@/components/admin/ui';
import { requireAdminPage } from '@/lib/auth/admin';
import type { Role } from '@/lib/auth/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { UsersManager } from './users-manager';

export const metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const me = await requireAdminPage('owner');
  const db = createServiceClient();
  const [{ data: admins }, { data: auth }] = await Promise.all([
    db.from('admin_users').select('user_id, role, name, is_active'),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const byId = new Map((auth?.users ?? []).map((u) => [u.id, u]));
  const rows = (admins ?? []).map((a) => {
    const u = byId.get(a.user_id);
    return {
      id: a.user_id,
      name: a.name,
      email: u?.email ?? '(unknown)',
      role: a.role as Role,
      isActive: a.is_active,
      lastSignIn: u?.last_sign_in_at ?? null,
      invitePending: !!u && !u.last_sign_in_at && !!u.invited_at,
    };
  });
  return (
    <>
      <PageHeader title="Users" description="Who can use the admin, and what they can do." />
      <UsersManager rows={rows} meId={me.id} />
    </>
  );
}
