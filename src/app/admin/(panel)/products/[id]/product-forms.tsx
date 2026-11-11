'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { Panel } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { formatGBP } from '@/lib/utils/money';

const fieldCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';

export function SyncProductButton({ sku }: { sku: string }) {
  const router = useRouter();
  const { can } = useAdmin();
  const [busy, setBusy] = useState(false);
  if (!can('sync.run')) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await runAction(
          () =>
            adminFetch<{ priceChanges: number; stockChanges: number; errors: number }>('/api/admin/sync', {
              body: { sku },
            }),
          {
            success: (x) =>
              x.errors
                ? 'Sync finished with errors, see Stock & sync'
                : `Synced: ${x.priceChanges} price and ${x.stockChanges} stock changes`,
          },
        );
        setBusy(false);
        if (r) router.refresh();
      }}
    >
      <RefreshCw className={busy ? 'animate-spin' : undefined} /> Sync this product
    </Button>
  );
}

export function MarginCalculator({
  cost,
  vatRate,
  floorPct,
  current,
}: {
  cost: number;
  vatRate: number;
  floorPct: number;
  current: number;
}) {
  const [price, setPrice] = useState(current.toFixed(2));
  const inc = Number(price) || 0;
  const ex = inc / (1 + vatRate);
  const profit = ex - cost;
  const margin = ex > 0 ? (profit / ex) * 100 : 0;
  const floorInc = (cost / (1 - floorPct / 100)) * (1 + vatRate);
  return (
    <Panel title="Margin calculator" description="Try a price to see the margin">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Sell price inc VAT (£)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={`${fieldCls} tabular`}
        />
      </label>
      <dl className="tabular mt-3 space-y-1 text-sm" aria-live="polite">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Ex VAT</dt>
          <dd>{formatGBP(ex)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Cost ex VAT</dt>
          <dd>{formatGBP(cost)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Profit per unit</dt>
          <dd className={profit < 0 ? 'text-red-600' : ''}>{formatGBP(profit)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Margin</dt>
          <dd className={margin < floorPct ? 'text-red-600' : 'text-emerald-600'}>{margin.toFixed(2)}%</dd>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <dt>Lowest price at {floorPct}% floor</dt>
          <dd>{formatGBP(floorInc)}</dd>
        </div>
      </dl>
    </Panel>
  );
}

interface OverridesProduct {
  id: string;
  name: string;
  description: string;
  titleOverride: string | null;
  descriptionOverride: string | null;
  priceOverrideIncVat: number | null;
  images: string[];
  isPublished: boolean;
  featured: boolean;
}

export function ProductOverridesForm({ product }: { product: OverridesProduct }) {
  const router = useRouter();
  const { can } = useAdmin();
  const editable = can('products.manage');
  const [title, setTitle] = useState(product.titleOverride ?? '');
  const [desc, setDesc] = useState(product.descriptionOverride ?? '');
  const [price, setPrice] = useState(product.priceOverrideIncVat?.toFixed(2) ?? '');
  const [images, setImages] = useState(product.images.join('\n'));
  const [published, setPublished] = useState(product.isPublished);
  const [featured, setFeatured] = useState(product.featured);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = price.trim() === '' ? null : Number(price);
    if (p !== null && (!Number.isFinite(p) || p <= 0)) return;
    setSaving(true);
    const r = await runAction(
      () =>
        adminFetch('/api/admin/products', {
          method: 'PATCH',
          body: {
            id: product.id,
            titleOverride: title.trim() || null,
            descriptionOverride: desc.trim() || null,
            priceOverrideIncVat: p,
            images: images
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
            isPublished: published,
            featured,
          },
        }),
      { success: 'Product saved' },
    );
    setSaving(false);
    if (r) router.refresh();
  };

  return (
    <Panel
      title="LaraDirect overrides"
      description="What customers see. Distributor data stays untouched and keeps syncing."
    >
      <form onSubmit={save} className="space-y-4">
        <fieldset disabled={!editable || saving} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={product.name}
              className={fieldCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description</span>
            <textarea
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={product.description}
              className={fieldCls}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Price override inc VAT (£)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Use pricing rules"
                className={`${fieldCls} tabular`}
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Leave blank to follow the pricing rules.
              </span>
            </label>
            <div className="space-y-3 pt-6 text-sm">
              <label className="flex items-center gap-3">
                <Switch checked={published} onCheckedChange={setPublished} /> Published on the store
              </label>
              <label className="flex items-center gap-3">
                <Switch checked={featured} onCheckedChange={setFeatured} /> Featured on the home page
              </label>
            </div>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Images (one path per line)</span>
            <textarea
              rows={3}
              value={images}
              onChange={(e) => setImages(e.target.value)}
              className={`${fieldCls} font-mono text-xs`}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Drop real photos into /public/products with the same file names and they replace the
              placeholders.
            </span>
          </label>
        </fieldset>
        {editable ? (
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />} Save changes
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Your role can view products but not edit them.</p>
        )}
      </form>
    </Panel>
  );
}
