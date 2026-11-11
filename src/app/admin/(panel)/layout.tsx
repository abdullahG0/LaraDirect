import { AdminShell } from '@/components/admin/shell/admin-shell';
import { requireAdminPage } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

// Every page under (panel) needs at least the viewer role; pages ask for more where needed.
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage('viewer');
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
