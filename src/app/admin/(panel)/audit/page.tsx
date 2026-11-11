import { PageHeader } from '@/components/admin/ui';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { AuditTable } from './audit-table';

export const metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  await requireAdminPage('admin');
  const db = createServiceClient();
  const [{ data: rows }, { data: admins }] = await Promise.all([
    db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(1000),
    db.from('admin_users').select('user_id, name'),
  ]);
  const names = new Map((admins ?? []).map((a) => [a.user_id, a.name ?? a.user_id.slice(0, 8)]));
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every price, rule, setting, product and order action, with who did it and what changed."
      />
      <AuditTable
        rows={(rows ?? []).map((r) => ({
          id: r.id,
          at: r.created_at ?? '',
          actor: r.actor ? (names.get(r.actor) ?? r.actor.slice(0, 8)) : 'system',
          action: r.action ?? '',
          entity: r.entity ?? '',
          entityId: r.entity_id,
          before: r.before,
          after: r.after,
        }))}
      />
    </>
  );
}
