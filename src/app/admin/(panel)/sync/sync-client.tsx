'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { DataTable } from '@/components/admin/data-table/data-table';
import { Panel, StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import type { Json } from '@/lib/supabase/types';

interface SyncRun {
  id: string;
  started_at: string | null;
  finished_at: string | null;
  type: string | null;
  products_seen: number | null;
  products_changed: number | null;
  price_changes: number | null;
  stock_changes: number | null;
  errors: number | null;
  log: string | null;
}

interface LogRow {
  id: number;
  method: string | null;
  status: string | null;
  duration_ms: number | null;
  created_at: string | null;
  request: Json;
  response: Json;
}

export function SyncControls({ categories }: { categories: string[] }) {
  const router = useRouter();
  const { can } = useAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [category, setCategory] = useState(categories[0] ?? '');
  if (!can('sync.run')) return null;

  const run = async (body: Record<string, string>, key: string) => {
    setBusy(key);
    const r = await runAction(
      () =>
        adminFetch<{ productsSeen: number; priceChanges: number; stockChanges: number; errors: number }>(
          '/api/admin/sync',
          { body },
        ),
      {
        success: (x) =>
          `Sync finished: ${x.productsSeen} checked, ${x.priceChanges} price and ${x.stockChanges} stock changes${x.errors ? `, ${x.errors} errors` : ''}`,
      },
    );
    setBusy(null);
    if (r) router.refresh();
  };

  return (
    <Panel className="mt-4" bodyClassName="flex flex-wrap items-center gap-3 p-3">
      <Button onClick={() => run({}, 'all')} disabled={!!busy}>
        <RefreshCw className={busy === 'all' ? 'animate-spin' : undefined} /> Sync now
      </Button>
      <span className="text-sm text-muted-foreground">or one category:</span>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        aria-label="Category to sync"
      >
        {categories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <Button variant="outline" onClick={() => run({ category }, 'cat')} disabled={!!busy}>
        <RefreshCw className={busy === 'cat' ? 'animate-spin' : undefined} /> Sync category
      </Button>
    </Panel>
  );
}

export function SyncRunsTable({ runs }: { runs: SyncRun[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!runs.length)
    return <p className="p-4 text-sm text-muted-foreground">No sync has run yet. Press “Sync now”.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted-foreground">
          <tr className="border-b">
            <th className="px-2 py-2 text-left">Started</th>
            <th className="px-2 py-2 text-left">Type</th>
            <th className="px-2 py-2 text-right">Duration</th>
            <th className="px-2 py-2 text-right">Seen</th>
            <th className="px-2 py-2 text-right">Price changes</th>
            <th className="px-2 py-2 text-right">Stock changes</th>
            <th className="px-2 py-2 text-right">Errors</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const dur =
              r.finished_at && r.started_at
                ? ((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1) +
                  's'
                : 'running';
            return (
              <Fragment key={r.id}>
                <tr className="border-b">
                  <td className="whitespace-nowrap px-2 py-2">{fmtDateTime(r.started_at)}</td>
                  <td className="px-2 py-2">{r.type}</td>
                  <td className="tabular px-2 py-2 text-right">{dur}</td>
                  <td className="tabular px-2 py-2 text-right">{r.products_seen ?? '—'}</td>
                  <td className="tabular px-2 py-2 text-right">{r.price_changes ?? '—'}</td>
                  <td className="tabular px-2 py-2 text-right">{r.stock_changes ?? '—'}</td>
                  <td className="px-2 py-2 text-right">
                    {(r.errors ?? 0) > 0 ? (
                      <StatusBadge status="error" label={String(r.errors)} />
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {r.log && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpen(open === r.id ? null : r.id)}
                        aria-expanded={open === r.id}
                      >
                        Log <ChevronDown className={open === r.id ? 'rotate-180' : undefined} />
                      </Button>
                    )}
                  </td>
                </tr>
                {open === r.id && (
                  <tr className="border-b bg-muted/40">
                    <td colSpan={8} className="px-2 py-2">
                      <pre className="whitespace-pre-wrap font-mono text-xs">{r.log}</pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AdapterLog({ logs }: { logs: LogRow[] }) {
  const [detail, setDetail] = useState<LogRow | null>(null);
  const columns = useMemo<ColumnDef<LogRow, unknown>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'When',
        meta: { label: 'When' },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{fmtDateTime(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'method',
        header: 'Method',
        meta: { label: 'Method' },
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Result',
        meta: { label: 'Result' },
        cell: ({ getValue }) => <StatusBadge status={(getValue() as string) ?? 'ok'} />,
      },
      {
        accessorKey: 'duration_ms',
        header: 'Time',
        meta: { label: 'Duration ms', align: 'right' },
        cell: ({ getValue }) => `${getValue() ?? 0} ms`,
      },
      {
        id: 'summary',
        header: 'Detail',
        meta: { label: 'Detail', csv: (r) => JSON.stringify(r.response) },
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-[380px] font-mono text-xs text-muted-foreground">
            {JSON.stringify(row.original.response)}
          </span>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <DataTable
        columns={columns}
        data={logs}
        getRowId={(r) => String(r.id)}
        searchPlaceholder="Filter calls…"
        csvFilename="distributor-calls.csv"
        pageSize={10}
        onRowClick={setDetail}
        rowClassName={(r) => (r.status === 'error' ? 'bg-red-500/5' : undefined)}
      />
      {detail && (
        <div className="mt-3 grid gap-3 rounded-lg border p-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Request · {detail.method}
            </p>
            <pre className="max-h-72 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(detail.request, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Response</p>
            <pre className="max-h-72 overflow-auto rounded bg-muted p-2 text-xs">
              {JSON.stringify(detail.response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
