'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { DataTable } from '@/components/admin/data-table/data-table';
import { StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RETURN_FLOW, type ReturnStatus } from '@/lib/admin/returns';

interface ReturnRow {
  id: string;
  status: string;
  reason: string | null;
  notes: string | null;
  rma: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  orderId: string | null;
  orderNumber: string;
  customer: string;
}

const fieldCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const NEXT_LABEL: Record<string, string> = {
  authorised: 'Authorise',
  received: 'Mark received',
  refunded: 'Mark refunded',
  rejected: 'Reject',
};

export function ReturnsBoard({ rows, prefillOrder }: { rows: ReturnRow[]; prefillOrder: string }) {
  const router = useRouter();
  const { can } = useAdmin();
  const editable = can('returns.manage');
  const [creating, setCreating] = useState(!!prefillOrder && editable);
  const [form, setForm] = useState({ orderNumber: prefillOrder, reason: '', tdsRmaReference: '', notes: '' });
  const [editing, setEditing] = useState<ReturnRow | null>(null);
  const [edit, setEdit] = useState({ notes: '', rma: '' });

  const move = async (r: ReturnRow, status: ReturnStatus) => {
    if (
      await runAction(() => adminFetch(`/api/admin/returns/${r.id}`, { method: 'PATCH', body: { status } }), {
        success: `Return ${status}`,
      })
    )
      router.refresh();
  };

  const columns = useMemo<ColumnDef<ReturnRow, unknown>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: 'Order',
        meta: { label: 'Order' },
        cell: ({ row }) =>
          row.original.orderId ? (
            <Link href={`/admin/orders/${row.original.orderId}`} className="font-medium hover:underline">
              {row.original.orderNumber}
            </Link>
          ) : (
            row.original.orderNumber
          ),
      },
      { accessorKey: 'customer', header: 'Customer', meta: { label: 'Customer' } },
      {
        accessorKey: 'reason',
        header: 'Reason',
        meta: { label: 'Reason' },
        cell: ({ getValue }) => <span className="line-clamp-2 max-w-[260px]">{getValue() as string}</span>,
      },
      {
        accessorKey: 'rma',
        header: 'TD SYNNEX RMA',
        meta: { label: 'RMA reference' },
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        meta: { label: 'Updated' },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-muted-foreground">{fmtDateTime(getValue() as string)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { csv: false, label: 'Actions' },
        cell: ({ row }) =>
          editable && (
            <span className="flex flex-wrap justify-end gap-1">
              {RETURN_FLOW[row.original.status as ReturnStatus].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === 'rejected' ? 'ghost' : 'outline'}
                  onClick={() => move(row.original, s)}
                >
                  {NEXT_LABEL[s]}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(row.original);
                  setEdit({ notes: row.original.notes ?? '', rma: row.original.rma ?? '' });
                }}
              >
                Notes
              </Button>
            </span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editable],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        searchPlaceholder="Order, customer, RMA…"
        searchText={(r) => `${r.orderNumber} ${r.customer} ${r.rma ?? ''} ${r.reason ?? ''}`}
        csvFilename="laradirect-returns.csv"
        emptyMessage="No returns logged."
        toolbar={
          editable && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus /> Log a return
            </Button>
          )
        }
      />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a return</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                ['orderNumber', 'Order number', 'LD-100042'],
                ['reason', 'Reason', 'e.g. Faulty screen, changed mind'],
                ['tdsRmaReference', 'TD SYNNEX RMA reference (optional)', ''],
              ] as const
            ).map(([k, label, ph]) => (
              <label key={k} className="block text-sm">
                <span className="mb-1 block font-medium">{label}</span>
                <input
                  value={form[k]}
                  placeholder={ph}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className={fieldCls}
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Notes (optional)</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={fieldCls}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                const r = await runAction(() => adminFetch('/api/admin/returns', { body: form }), {
                  success: 'Return logged',
                });
                if (r) {
                  setCreating(false);
                  setForm({ orderNumber: '', reason: '', tdsRmaReference: '', notes: '' });
                  router.refresh();
                }
              }}
            >
              Log return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for {editing?.orderNumber}</DialogTitle>
          </DialogHeader>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">TD SYNNEX RMA reference</span>
            <input
              value={edit.rma}
              onChange={(e) => setEdit({ ...edit, rma: e.target.value })}
              className={fieldCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea
              rows={4}
              value={edit.notes}
              onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
              className={fieldCls}
            />
          </label>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!editing) return;
                const r = await runAction(
                  () =>
                    adminFetch(`/api/admin/returns/${editing.id}`, {
                      method: 'PATCH',
                      body: { notes: edit.notes || null, tdsRmaReference: edit.rma || null },
                    }),
                  { success: 'Saved' },
                );
                if (r) {
                  setEditing(null);
                  router.refresh();
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
