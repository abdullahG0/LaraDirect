'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import { Money, fmtDate } from '@/components/admin/ui';
import type { AdminCustomerRow } from '@/lib/admin/customers';

export function CustomersTable({ rows }: { rows: AdminCustomerRow[] }) {
  const router = useRouter();
  const columns = useMemo<ColumnDef<AdminCustomerRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Customer',
        meta: { label: 'Name' },
        cell: ({ row }) => (
          <span>
            <span className="block font-medium">{row.original.name}</span>
            <span className="block text-xs text-muted-foreground">{row.original.email}</span>
          </span>
        ),
      },
      { accessorKey: 'email', header: 'Email', meta: { label: 'Email' } },
      {
        accessorKey: 'organisation',
        header: 'Organisation',
        meta: { label: 'Organisation' },
        cell: ({ getValue }) => (getValue() as string) ?? '—',
      },
      { accessorKey: 'orders', header: 'Orders', meta: { label: 'Orders', align: 'right' } },
      {
        accessorKey: 'lifetimeValue',
        header: 'Lifetime value',
        meta: { label: 'Lifetime value', align: 'right' },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'lastOrderAt',
        header: 'Last order',
        meta: { label: 'Last order' },
        cell: ({ getValue }) => fmtDate(getValue() as string),
      },
      {
        accessorKey: 'hasAccount',
        header: 'Account',
        meta: { label: 'Has account' },
        cell: ({ getValue }) => (getValue() ? 'Yes' : 'Guest'),
      },
    ],
    [],
  );
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      searchPlaceholder="Name, email, school…"
      searchText={(r) => `${r.name} ${r.email} ${r.organisation ?? ''} ${r.phone ?? ''}`}
      csvFilename="laradirect-customers.csv"
      initialSorting={[{ id: 'lifetimeValue', desc: true }]}
      initialHidden={['email']}
      onRowClick={(r) => router.push(`/admin/customers/${r.id}`)}
    />
  );
}
