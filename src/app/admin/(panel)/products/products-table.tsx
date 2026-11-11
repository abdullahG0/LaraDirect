'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, EyeOff, Percent, Star, StarOff } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable } from '@/components/admin/data-table/data-table';
import { MarginText, Money, StatusBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { AdminProductRow } from '@/lib/admin/products';
import { formatGBP } from '@/lib/utils/money';

const selectCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

function OverrideCell({
  row,
  editable,
  onSaved,
}: {
  row: AdminProductRow;
  editable: boolean;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(row.overrideIncVat?.toFixed(2) ?? '');
  const [saving, setSaving] = useState(false);
  if (!editable) return <Money value={row.overrideIncVat} />;
  const save = async () => {
    const next = value.trim() === '' ? null : Number(value);
    if (next !== null && (!Number.isFinite(next) || next <= 0)) {
      setValue(row.overrideIncVat?.toFixed(2) ?? '');
      return;
    }
    if (next === row.overrideIncVat) return;
    setSaving(true);
    const r = await runAction(
      () =>
        adminFetch('/api/admin/products', {
          method: 'PATCH',
          body: { id: row.id, priceOverrideIncVat: next },
        }),
      {
        success: next === null ? 'Override removed' : `Price set to ${formatGBP(next)}`,
      },
    );
    setSaving(false);
    if (r) onSaved();
  };
  return (
    <input
      value={value}
      inputMode="decimal"
      placeholder="—"
      disabled={saving}
      aria-label={`Price override for ${row.name} (inc VAT)`}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setValue(row.overrideIncVat?.toFixed(2) ?? '');
      }}
      className="tabular h-8 w-24 rounded-md border border-input bg-background px-2 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

export function ProductsTable({ rows, initialFilter }: { rows: AdminProductRow[]; initialFilter: string }) {
  const router = useRouter();
  const { can } = useAdmin();
  const editable = can('products.manage');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [stock, setStock] = useState('');
  const [flag, setFlag] = useState(initialFilter);
  const [markup, setMarkup] = useState('10');

  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows]);
  const brands = useMemo(() => [...new Set(rows.map((r) => r.brand))].sort(), [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!category || r.category === category) &&
          (!brand || r.brand === brand) &&
          (!stock || r.stockStatus === stock) &&
          (!flag ||
            (flag === 'below_floor' && r.marginStatus !== 'ok') ||
            (flag === 'unpublished' && !r.isPublished) ||
            (flag === 'overridden' && r.overrideIncVat !== null) ||
            (flag === 'featured' && r.featured)),
      ),
    [rows, category, brand, stock, flag],
  );

  const toggle = async (row: AdminProductRow, field: 'isPublished' | 'featured', value: boolean) => {
    const r = await runAction(
      () => adminFetch('/api/admin/products', { method: 'PATCH', body: { id: row.id, [field]: value } }),
      {
        success:
          field === 'isPublished'
            ? value
              ? 'Published'
              : 'Unpublished'
            : value
              ? 'Featured'
              : 'No longer featured',
      },
    );
    if (r) router.refresh();
  };

  const columns = useMemo<ColumnDef<AdminProductRow, unknown>[]>(
    () => [
      {
        id: 'image',
        header: '',
        enableSorting: false,
        meta: { label: 'Image', csv: false, className: 'w-12' },
        cell: ({ row }) => (
          <div className="relative size-9 overflow-hidden rounded bg-muted">
            {row.original.image && (
              <Image src={row.original.image} alt="" fill sizes="36px" className="object-contain" />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Product',
        meta: { label: 'Name' },
        cell: ({ row }) => (
          <Link
            href={`/admin/products/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block max-w-[280px] hover:underline"
          >
            <span className="line-clamp-1 font-medium">{row.original.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{row.original.sku}</span>
          </Link>
        ),
      },
      { accessorKey: 'sku', header: 'SKU', meta: { label: 'SKU' } },
      { accessorKey: 'brand', header: 'Brand', meta: { label: 'Brand' } },
      { accessorKey: 'category', header: 'Category', meta: { label: 'Category' } },
      {
        accessorKey: 'cost',
        header: 'Cost',
        meta: { label: 'Cost ex VAT', align: 'right' },
        cell: ({ getValue }) => <Money value={getValue() as number} />,
      },
      {
        accessorKey: 'rulePriceIncVat',
        header: 'Rule price',
        meta: { label: 'Rule price inc VAT', align: 'right' },
        cell: ({ getValue }) => <Money value={getValue() as number} className="text-muted-foreground" />,
      },
      {
        accessorKey: 'overrideIncVat',
        header: 'Override',
        meta: { label: 'Override inc VAT', align: 'right' },
        cell: ({ row }) => (
          <OverrideCell
            key={`${row.original.id}-${row.original.overrideIncVat}`}
            row={row.original}
            editable={editable}
            onSaved={() => router.refresh()}
          />
        ),
      },
      {
        accessorKey: 'sellIncVat',
        header: 'Sell price',
        meta: { label: 'Sell price inc VAT', align: 'right' },
        cell: ({ getValue }) => <Money value={getValue() as number} className="font-medium" />,
      },
      {
        accessorKey: 'marginPct',
        header: 'Margin',
        meta: { label: 'Margin %', align: 'right' },
        cell: ({ row }) => <MarginText pct={row.original.marginPct} floor={row.original.floorPct} />,
      },
      {
        accessorKey: 'ruleLabel',
        header: 'Rule',
        meta: { label: 'Rule' },
        cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span>,
      },
      { accessorKey: 'stockQty', header: 'Stock', meta: { label: 'Stock qty', align: 'right' } },
      {
        accessorKey: 'stockStatus',
        header: 'Status',
        meta: { label: 'Stock status' },
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        accessorKey: 'isPublished',
        header: 'Published',
        meta: { label: 'Published' },
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={row.original.isPublished}
              disabled={!editable}
              onCheckedChange={(v) => toggle(row.original, 'isPublished', v)}
              aria-label={`Published: ${row.original.name}`}
            />
          </span>
        ),
      },
      {
        accessorKey: 'featured',
        header: 'Featured',
        meta: { label: 'Featured' },
        cell: ({ row }) => (
          <span onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={row.original.featured}
              disabled={!editable}
              onCheckedChange={(v) => toggle(row.original, 'featured', v)}
              aria-label={`Featured: ${row.original.name}`}
            />
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editable],
  );

  const bulk = async (
    ids: string[],
    action: string,
    extra: Record<string, unknown> = {},
    clear?: () => void,
  ) => {
    const r = await runAction(
      () => adminFetch<{ count: number }>('/api/admin/products/bulk', { body: { action, ids, ...extra } }),
      {
        success: (x) => `Updated ${x.count} products`,
      },
    );
    if (r) {
      clear?.();
      router.refresh();
    }
  };

  return (
    <DataTable
      columns={columns}
      data={filtered}
      getRowId={(r) => r.id}
      searchPlaceholder="Name, SKU, brand…"
      searchText={(r) => `${r.name} ${r.sku} ${r.brand} ${r.category} ${r.subcategory ?? ''}`}
      csvFilename="laradirect-products.csv"
      initialHidden={['sku', 'brand', 'ruleLabel', 'rulePriceIncVat']}
      selectable={editable}
      onRowClick={(r) => router.push(`/admin/products/${r.id}`)}
      rowClassName={(r) =>
        r.marginStatus !== 'ok' ? 'bg-red-500/5' : !r.isPublished ? 'opacity-70' : undefined
      }
      toolbar={
        <>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectCls}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={selectCls}
            aria-label="Brand"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={selectCls}
            aria-label="Stock status"
          >
            <option value="">Any stock</option>
            {['in_stock', 'low_stock', 'out_of_stock', 'backorder', 'discontinued'].map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            className={selectCls}
            aria-label="Show only"
          >
            <option value="">All products</option>
            <option value="below_floor">Below margin floor</option>
            <option value="unpublished">Unpublished</option>
            <option value="overridden">Price overridden</option>
            <option value="featured">Featured</option>
          </select>
        </>
      }
      bulkActions={(sel, clear) => {
        const ids = sel.map((r) => r.id);
        return (
          <>
            <Button size="sm" variant="outline" onClick={() => bulk(ids, 'publish', {}, clear)}>
              <Eye /> Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulk(ids, 'unpublish', {}, clear)}>
              <EyeOff /> Unpublish
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulk(ids, 'feature', {}, clear)}>
              <Star /> Feature
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulk(ids, 'unfeature', {}, clear)}>
              <StarOff /> Unfeature
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline">
                  <Percent /> Apply markup
                </Button>
              }
              title={`Apply a markup to ${ids.length} products`}
              description="Creates (or updates) a SKU pricing rule for each product, then re-prices them. Price history is recorded."
              confirmLabel="Apply markup"
              onConfirm={() => bulk(ids, 'markup', { markupPct: Number(markup) }, clear)}
            >
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Markup on cost (%)</span>
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={0.5}
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  className="h-9 w-32 rounded-md border border-input bg-background px-3"
                />
              </label>
            </ConfirmDialog>
          </>
        );
      }}
    />
  );
}
