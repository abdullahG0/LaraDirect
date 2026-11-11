'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import { Panel, fmtDateTime } from '@/components/admin/ui';
import { diffValues } from '@/lib/admin/diff';

interface AuditRow {
  id: number;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
}

const LINKS: Record<string, string> = {
  order: '/admin/orders/',
  product: '/admin/products/',
  customer: '/admin/customers/',
};

const show = (v: unknown) => (v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v));

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [entity, setEntity] = useState('');
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const entities = useMemo(() => [...new Set(rows.map((r) => r.entity))].sort(), [rows]);
  const data = useMemo(() => rows.filter((r) => !entity || r.entity === entity), [rows, entity]);

  const columns = useMemo<ColumnDef<AuditRow, unknown>[]>(
    () => [
      {
        accessorKey: 'at',
        header: 'When',
        meta: { label: 'When' },
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{fmtDateTime(getValue() as string)}</span>
        ),
      },
      { accessorKey: 'actor', header: 'Who', meta: { label: 'Who' } },
      {
        accessorKey: 'action',
        header: 'Action',
        meta: { label: 'Action' },
        cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
      },
      { accessorKey: 'entity', header: 'Entity', meta: { label: 'Entity' } },
      {
        accessorKey: 'entityId',
        header: 'ID',
        meta: { label: 'Entity ID' },
        cell: ({ row }) => {
          const { entity: e, entityId: id } = row.original;
          if (!id) return '—';
          return LINKS[e] ? (
            <Link
              href={`${LINKS[e]}${id}`}
              onClick={(ev) => ev.stopPropagation()}
              className="font-mono text-xs hover:underline"
            >
              {id.slice(0, 8)}
            </Link>
          ) : (
            <span className="font-mono text-xs">{id.length > 20 ? id.slice(0, 8) : id}</span>
          );
        },
      },
      {
        id: 'changes',
        header: 'Changes',
        meta: {
          label: 'Changes',
          csv: (r) =>
            diffValues(r.before, r.after)
              .map((d) => `${d.path}: ${show(d.before)} → ${show(d.after)}`)
              .join('; '),
        },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {diffValues(row.original.before, row.original.after).length} fields
          </span>
        ),
      },
    ],
    [],
  );

  const diff = selected ? diffValues(selected.before, selected.after) : [];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        getRowId={(r) => String(r.id)}
        searchPlaceholder="Action, who, ID…"
        searchText={(r) => `${r.action} ${r.actor} ${r.entity} ${r.entityId ?? ''}`}
        csvFilename="laradirect-audit.csv"
        onRowClick={setSelected}
        initialSorting={[{ id: 'at', desc: true }]}
        toolbar={
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Entity"
          >
            <option value="">All entities</option>
            {entities.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        }
      />
      {selected && (
        <Panel
          title={`${selected.action} · ${fmtDateTime(selected.at)} · ${selected.actor}`}
          bodyClassName="p-0"
        >
          {diff.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No field changes recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Field</th>
                  <th className="px-3 py-2 text-left">Before</th>
                  <th className="px-4 py-2 text-left">After</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((d) => (
                  <tr key={d.path} className="border-t align-top">
                    <td className="px-4 py-1.5 font-mono text-xs">{d.path}</td>
                    <td className="max-w-[360px] break-words px-3 py-1.5 text-red-700 dark:text-red-400">
                      {show(d.before)}
                    </td>
                    <td className="max-w-[360px] break-words px-4 py-1.5 text-emerald-700 dark:text-emerald-400">
                      {show(d.after)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}
    </div>
  );
}
