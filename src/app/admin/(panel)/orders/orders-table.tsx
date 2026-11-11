'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, RefreshCw, RotateCw } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch } from '@/components/admin/api';
import { DataTable } from '@/components/admin/data-table/data-table';
import { Money, StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import type { AdminOrderRow } from '@/lib/admin/orders';
import { ALL_STATUSES } from '@/lib/orders/lifecycle';
import { toast } from 'sonner';

const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export function OrdersTable({ orders, initialStatus }: { orders: AdminOrderRow[]; initialStatus: string }) {
  const router = useRouter();
  const { can } = useAdmin();
  const [status, setStatus] = useState(initialStatus);
  const [range, setRange] = useState('all');
  const [issuesOnly, setIssuesOnly] = useState(false);

  const filtered = useMemo(() => {
    const from = range === 'all' ? 0 : Date.now() - Number(range) * 86400_000;
    return orders.filter(
      (o) =>
        (!status || o.status === status) &&
        new Date(o.createdAt).getTime() >= from &&
        (!issuesOnly ||
          o.status === 'failed' ||
          o.status === 'backordered' ||
          o.marginAlert ||
          !!o.lastError),
    );
  }, [orders, status, range, issuesOnly]);

  const columns = useMemo<ColumnDef<AdminOrderRow, unknown>[]>(
    () => [
      {
        accessorKey: 'orderNumber',
        header: 'Order',
        meta: { label: 'Order' },
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 font-medium">
            {row.original.orderNumber}
            {(row.original.status === 'failed' || row.original.marginAlert) && (
              <AlertTriangle className="size-3.5 text-amber-600" aria-label="Has an issue" />
            )}
            {row.original.isSample && (
              <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">sample</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Placed',
        meta: { label: 'Placed' },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-muted-foreground">{fmtDateTime(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        meta: { label: 'Customer' },
        cell: ({ row }) => (
          <span className="block max-w-[220px]">
            <span className="block truncate">{row.original.customerName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {row.original.organisation ?? row.original.email}
            </span>
          </span>
        ),
      },
      { accessorKey: 'email', header: 'Email', meta: { label: 'Email' } },
      {
        accessorKey: 'status',
        header: 'Status',
        meta: { label: 'Status' },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      { accessorKey: 'items', header: 'Items', meta: { label: 'Items', align: 'right' } },
      {
        accessorKey: 'total',
        header: 'Total',
        meta: { label: 'Total (inc VAT)', align: 'right' },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'profit',
        header: 'Profit',
        meta: { label: 'Gross profit', align: 'right' },
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          return <Money value={v} className={v !== null && v < 0 ? 'text-red-600' : undefined} />;
        },
      },
      {
        accessorKey: 'distributorOrderId',
        header: 'TD SYNNEX ID',
        meta: { label: 'TD SYNNEX ID' },
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span>,
      },
      { accessorKey: 'schoolPo', header: 'School PO', meta: { label: 'School PO' } },
      {
        accessorKey: 'lastError',
        header: 'Last error',
        meta: { label: 'Last error' },
        cell: ({ getValue }) => (
          <span className="line-clamp-1 max-w-[240px] text-xs text-red-600">
            {(getValue() as string) ?? ''}
          </span>
        ),
      },
    ],
    [],
  );

  const bulk = async (rows: AdminOrderRow[], action: 'retry' | 'refresh', clear: () => void) => {
    const targets = action === 'retry' ? rows.filter((r) => r.status === 'failed') : rows;
    if (!targets.length) {
      toast.info(action === 'retry' ? 'None of the selected orders have failed' : 'Nothing selected');
      return;
    }
    let ok = 0;
    for (const r of targets) {
      try {
        await adminFetch(`/api/admin/orders/${r.id}/${action}`, { body: {} });
        ok++;
      } catch (err) {
        toast.error(`${r.orderNumber}: ${(err as Error).message}`);
      }
    }
    toast.success(`${action === 'retry' ? 'Retried' : 'Refreshed'} ${ok} of ${targets.length} orders`);
    clear();
    router.refresh();
  };

  return (
    <DataTable
      columns={columns}
      data={filtered}
      getRowId={(r) => r.id}
      searchPlaceholder="Order no., email, name, PO…"
      searchText={(r) =>
        `${r.orderNumber} ${r.email} ${r.customerName} ${r.organisation ?? ''} ${r.schoolPo ?? ''} ${r.distributorOrderId ?? ''}`
      }
      csvFilename="laradirect-orders.csv"
      initialSorting={[{ id: 'createdAt', desc: true }]}
      initialHidden={['email', 'schoolPo', 'lastError']}
      selectable={can('orders.manage')}
      onRowClick={(r) => router.push(`/admin/orders/${r.id}`)}
      rowClassName={(r) => (r.status === 'failed' ? 'bg-red-500/5' : undefined)}
      emptyMessage="No orders match these filters."
      toolbar={
        <>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectCls}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className={selectCls}
            aria-label="Date range"
          >
            <option value="all">All time</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
            <input
              type="checkbox"
              checked={issuesOnly}
              onChange={(e) => setIssuesOnly(e.target.checked)}
              className="accent-primary"
            />
            Has issue
          </label>
        </>
      }
      bulkActions={(rows, clear) => (
        <>
          <Button size="sm" variant="outline" onClick={() => bulk(rows, 'retry', clear)}>
            <RotateCw /> Retry failed
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk(rows, 'refresh', clear)}>
            <RefreshCw /> Refresh status
          </Button>
        </>
      )}
    />
  );
}
