'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { adminFetch, runAction } from '@/components/admin/api';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Panel, StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ROLE_LABELS, ROLES, type Role } from '@/lib/auth/roles';

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  lastSignIn: string | null;
  invitePending: boolean;
}

const fieldCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const ROLE_HELP: Record<Role, string> = {
  owner: 'Everything, including users and settings',
  admin: 'Orders, products, pricing and sync',
  support: 'Orders, customers and returns; no pricing',
  viewer: 'Read-only',
};

export function UsersManager({ rows, meId }: { rows: UserRow[]; meId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'support' as Role });

  const patch = async (id: string, body: Record<string, unknown>, msg: string) => {
    if (
      await runAction(() => adminFetch(`/api/admin/users/${id}`, { method: 'PATCH', body }), { success: msg })
    )
      router.refresh();
  };

  return (
    <Panel
      title={`${rows.length} admin users`}
      bodyClassName="p-0"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus /> Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite an admin user</DialogTitle>
              <DialogDescription>They’ll get an email from Supabase to set a password.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={fieldCls}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={fieldCls}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className={fieldCls}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}: {ROLE_HELP[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <DialogFooter>
              <Button
                onClick={async () => {
                  const r = await runAction(
                    () => adminFetch<{ invited: boolean }>('/api/admin/users', { body: form }),
                    {
                      success: (x) => (x.invited ? 'Invite sent' : 'Access granted to existing account'),
                    },
                  );
                  if (r) {
                    setOpen(false);
                    setForm({ email: '', name: '', role: 'support' });
                    router.refresh();
                  }
                }}
              >
                Send invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">User</th>
            <th className="px-3 py-2 text-left">Role</th>
            <th className="px-3 py-2 text-left">Last sign-in</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-2">
                <span className="block font-medium">
                  {u.name ?? '—'}{' '}
                  {u.id === meId && <span className="text-xs text-muted-foreground">(you)</span>}
                </span>
                <span className="block text-xs text-muted-foreground">{u.email}</span>
              </td>
              <td className="px-3 py-2">
                <select
                  aria-label={`Role for ${u.email}`}
                  value={u.role}
                  disabled={u.id === meId}
                  onChange={(e) =>
                    patch(
                      u.id,
                      { role: e.target.value },
                      `Role changed to ${ROLE_LABELS[e.target.value as Role]}`,
                    )
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {u.invitePending ? 'Invite pending' : fmtDateTime(u.lastSignIn)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge
                  status={u.isActive ? 'ok' : 'discontinued'}
                  label={u.isActive ? 'active' : 'deactivated'}
                />
              </td>
              <td className="px-4 py-2 text-right">
                {u.id !== meId &&
                  (u.isActive ? (
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost">
                          Deactivate
                        </Button>
                      }
                      title={`Deactivate ${u.name ?? u.email}?`}
                      description="They lose admin access straight away. You can reactivate them later."
                      confirmLabel="Deactivate"
                      destructive
                      onConfirm={() => patch(u.id, { isActive: false }, 'User deactivated')}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patch(u.id, { isActive: true }, 'User reactivated')}
                    >
                      Reactivate
                    </Button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
