'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, Eye, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Money, Panel, StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  calculatePrice,
  type ImpactPreview,
  type PricedProduct,
  type PricingRule,
} from '@/lib/pricing/engine';
import { pricingRuleInputSchema, type PricingRuleInput } from '@/lib/validation/pricing';
import { formatGBP } from '@/lib/utils/money';

const fieldCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive';
const SCOPE_ORDER = { sku: 0, brand: 1, category: 2, global: 3 } as const;

interface HistoryRow {
  id: number;
  productId: string | null;
  name: string;
  cost: number;
  sell: number;
  reason: string;
  at: string;
}

type FormValues = {
  scope: PricingRuleInput['scope'];
  scopeValue: string | null;
  markupType: PricingRuleInput['markupType'];
  markupValue: number;
  minMarginPct: number;
  minMarginAmount: number;
  rounding: PricingRuleInput['rounding'];
  priority: number;
  isActive: boolean;
};

function ImpactView({ impact }: { impact: ImpactPreview }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-3 text-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Prices changing</p>
          <p className="text-xl font-semibold">{impact.productsAffected}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg margin</p>
          <p className="text-xl font-semibold">
            {impact.avgMarginBefore.toFixed(1)}% → {impact.avgMarginAfter.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Below floor</p>
          <p className="text-xl font-semibold">
            {impact.belowFloorBefore} → {impact.belowFloorAfter}
          </p>
        </div>
      </div>
      {impact.biggestChanges.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Biggest changes
          </p>
          <table className="w-full text-xs">
            <tbody>
              {impact.biggestChanges.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="py-1 pr-2">{c.name}</td>
                  <td className="tabular py-1 text-right">{formatGBP(c.before)}</td>
                  <td className="px-1 text-muted-foreground">→</td>
                  <td
                    className={`tabular py-1 text-right font-medium ${c.after > c.before ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}
                  >
                    {formatGBP(c.after)}
                  </td>
                  <td className="tabular py-1 pl-2 text-right text-muted-foreground">
                    {c.marginAfter.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  rule,
  categories,
  brands,
  skus,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rule: PricingRule | null;
  categories: string[];
  brands: string[];
  skus: { sku: string; name: string }[];
  onSaved: () => void;
}) {
  const [impact, setImpact] = useState<ImpactPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(pricingRuleInputSchema) as never,
    values: rule
      ? { ...rule, scopeValue: rule.scopeValue ?? null }
      : {
          scope: 'category',
          scopeValue: categories[0] ?? null,
          markupType: 'percent',
          markupValue: 10,
          minMarginPct: 5,
          minMarginAmount: 0,
          rounding: 'x.99',
          priority: 0,
          isActive: true,
        },
  });
  const { register, watch, handleSubmit, formState } = form;
  const scope = watch('scope');
  const errors = formState.errors;

  const body = (v: FormValues) =>
    rule ? { action: 'update', id: rule.id, rule: v } : { action: 'create', rule: v };

  const preview = handleSubmit(async (v) => {
    setPreviewing(true);
    try {
      setImpact(await adminFetch<ImpactPreview>('/api/admin/pricing-rules/preview', { body: body(v) }));
    } catch (err) {
      form.setError('root', { message: (err as Error).message });
    } finally {
      setPreviewing(false);
    }
  });

  const apply = handleSubmit(async (v) => {
    setSaving(true);
    const r = await runAction(
      () =>
        adminFetch<{ recalc: { changed: number } }>(
          rule ? `/api/admin/pricing-rules/${rule.id}` : '/api/admin/pricing-rules',
          { method: rule ? 'PATCH' : 'POST', body: v },
        ),
      { success: (x) => `Rule saved. ${x.recalc.changed} prices updated.` },
    );
    setSaving(false);
    if (r) {
      setImpact(null);
      onOpenChange(false);
      onSaved();
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setImpact(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit pricing rule' : 'New pricing rule'}</DialogTitle>
          <DialogDescription>
            Preview the impact first. Applying re-prices every product and records price history.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onChange={() => setImpact(null)}
          onSubmit={(e) => {
            e.preventDefault();
            preview();
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium">Applies to</span>
            <select {...register('scope')} className={fieldCls} disabled={rule?.scope === 'global'}>
              <option value="global">Everything (global)</option>
              <option value="category">A category</option>
              <option value="brand">A brand</option>
              <option value="sku">One product (SKU)</option>
            </select>
          </label>
          {scope !== 'global' && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">
                {scope === 'sku' ? 'SKU' : scope === 'brand' ? 'Brand' : 'Category'}
              </span>
              <input
                list={`list-${scope}`}
                {...register('scopeValue')}
                className={fieldCls}
                aria-invalid={!!errors.scopeValue}
              />
              <datalist id={`list-${scope}`}>
                {(scope === 'category'
                  ? categories
                  : scope === 'brand'
                    ? brands
                    : skus.map((s) => s.sku)
                ).map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              {errors.scopeValue && (
                <span className="mt-1 block text-xs text-destructive">{errors.scopeValue.message}</span>
              )}
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block font-medium">Markup type</span>
            <select {...register('markupType')} className={fieldCls}>
              <option value="percent">Percent of cost</option>
              <option value="fixed">Fixed £ amount</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Markup</span>
            <input
              type="number"
              step="0.01"
              {...register('markupValue', { valueAsNumber: true })}
              className={fieldCls}
              aria-invalid={!!errors.markupValue}
            />
            {errors.markupValue && (
              <span className="mt-1 block text-xs text-destructive">{errors.markupValue.message}</span>
            )}
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Minimum margin (%)</span>
            <input
              type="number"
              step="0.1"
              {...register('minMarginPct', { valueAsNumber: true })}
              className={fieldCls}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Minimum margin (£)</span>
            <input
              type="number"
              step="0.01"
              {...register('minMarginAmount', { valueAsNumber: true })}
              className={fieldCls}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Rounding</span>
            <select {...register('rounding')} className={fieldCls}>
              <option value="x.99">£x.99</option>
              <option value="x.95">£x.95</option>
              <option value="nearest_1">Nearest £1</option>
              <option value="none">No rounding</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Priority</span>
            <input type="number" {...register('priority', { valueAsNumber: true })} className={fieldCls} />
            <span className="mt-1 block text-xs text-muted-foreground">
              Breaks ties between rules of the same scope
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" {...register('isActive')} className="size-4 accent-primary" /> Active
          </label>
          {errors.root && <p className="text-sm text-destructive sm:col-span-2">{errors.root.message}</p>}
        </form>
        {impact && <ImpactView impact={impact} />}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => preview()} disabled={previewing}>
            {previewing ? <Loader2 className="animate-spin" /> : <Eye />} Preview impact
          </Button>
          <Button
            onClick={() => apply()}
            disabled={!impact || saving}
            title={!impact ? 'Preview the impact first' : undefined}
          >
            {saving && <Loader2 className="animate-spin" />} Apply and re-price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Simulator({
  products,
  rules,
  vatRate,
}: {
  products: PricedProduct[];
  rules: PricingRule[];
  vatRate: number;
}) {
  const [id, setId] = useState(products[0]?.id ?? '');
  const [cost, setCost] = useState<string>('');
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  const c = cost === '' ? p.costPriceExVat : Number(cost) || 0;
  const r = calculatePrice({ ...p, costPriceExVat: c }, rules, vatRate);
  return (
    <Panel title="Price build-up simulator" description="Pick a product, optionally try a different cost">
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Product</span>
          <select
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setCost('');
            }}
            className={fieldCls}
          >
            {products.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Cost ex VAT</span>
          <input
            type="number"
            step="0.01"
            value={cost}
            placeholder={p.costPriceExVat.toFixed(2)}
            onChange={(e) => setCost(e.target.value)}
            className={fieldCls}
          />
        </label>
      </div>
      <ol className="mt-3 divide-y rounded-lg border text-sm">
        {r.steps.map((s, i) => (
          <li
            key={i}
            className={`flex justify-between px-3 py-1.5 ${i === r.steps.length - 1 ? 'font-semibold' : ''}`}
          >
            <span>{s.label}</span>
            <Money value={s.value} />
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm">
        Margin{' '}
        <strong className={r.marginStatus === 'ok' ? '' : 'text-destructive'}>
          {r.marginPct.toFixed(2)}%
        </strong>{' '}
        ({formatGBP(r.marginAmount)} per unit)
        {r.marginStatus !== 'ok' && ' · below floor'}
      </p>
    </Panel>
  );
}

export function PricingWorkspace({
  rules,
  vatRate,
  categories,
  brands,
  products,
  history,
}: {
  rules: PricingRule[];
  vatRate: number;
  categories: string[];
  brands: string[];
  products: PricedProduct[];
  history: HistoryRow[];
}) {
  const router = useRouter();
  const { can } = useAdmin();
  const editable = can('pricing.manage');
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [open, setOpen] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      for (const r of rules) {
        const match =
          r.scope === 'global' ||
          (r.scope === 'category' && r.scopeValue === p.category) ||
          (r.scope === 'brand' && r.scopeValue === p.brand) ||
          (r.scope === 'sku' && r.scopeValue === p.sku);
        if (match) m.set(r.id, (m.get(r.id) ?? 0) + 1);
      }
    }
    return m;
  }, [products, rules]);
  const sorted = [...rules].sort(
    (a, b) =>
      SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope] || (a.scopeValue ?? '').localeCompare(b.scopeValue ?? ''),
  );

  return (
    <div className="space-y-4">
      {!editable && (
        <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
          You can view pricing and preview changes, but only admins and owners can edit rules.
        </p>
      )}
      <Panel
        title={`Rules (${rules.length})`}
        bodyClassName="p-0"
        actions={
          editable && (
            <div className="flex gap-2">
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline" disabled={recalcing}>
                    <RefreshCw className={recalcing ? 'animate-spin' : undefined} /> Recalculate all
                  </Button>
                }
                title="Re-price every product?"
                description="Applies the current rules to all products and writes price history for anything that changes."
                confirmLabel="Recalculate"
                onConfirm={async () => {
                  setRecalcing(true);
                  const r = await runAction(
                    () => adminFetch<{ changed: number }>('/api/admin/pricing/recalculate', { body: {} }),
                    { success: (x) => `${x.changed} prices changed` },
                  );
                  setRecalcing(false);
                  if (r) router.refresh();
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus /> New rule
              </Button>
            </div>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Applies to</th>
                <th className="px-3 py-2 text-right font-semibold">Markup</th>
                <th className="px-3 py-2 text-right font-semibold">Floor</th>
                <th className="px-3 py-2 text-left font-semibold">Rounding</th>
                <th className="px-3 py-2 text-right font-semibold">Priority</th>
                <th className="px-3 py-2 text-right font-semibold">Matches</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">
                    <span className="text-xs uppercase text-muted-foreground">{r.scope}</span>{' '}
                    <span className="font-medium">{r.scopeValue ?? 'All products'}</span>
                  </td>
                  <td className="tabular px-3 py-2 text-right">
                    {r.markupType === 'percent' ? `${r.markupValue}%` : formatGBP(r.markupValue)}
                  </td>
                  <td className="tabular px-3 py-2 text-right">
                    {r.minMarginPct}%{r.minMarginAmount > 0 && ` / ${formatGBP(r.minMarginAmount)}`}
                  </td>
                  <td className="px-3 py-2">{r.rounding}</td>
                  <td className="tabular px-3 py-2 text-right">{r.priority}</td>
                  <td className="tabular px-3 py-2 text-right text-muted-foreground">
                    {counts.get(r.id) ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      status={r.isActive ? 'ok' : 'discontinued'}
                      label={r.isActive ? 'active' : 'off'}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editable && (
                      <span className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Edit rule"
                          onClick={() => {
                            setEditing(r);
                            setOpen(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                        {r.scope !== 'global' && (
                          <ConfirmDialog
                            trigger={
                              <Button size="icon" variant="ghost" aria-label="Delete rule">
                                <Trash2 />
                              </Button>
                            }
                            title="Delete this rule?"
                            description="Matching products fall back to the next most specific rule and are re-priced."
                            confirmLabel="Delete and re-price"
                            destructive
                            onConfirm={async () => {
                              if (
                                await runAction(
                                  () => adminFetch(`/api/admin/pricing-rules/${r.id}`, { method: 'DELETE' }),
                                  { success: 'Rule deleted' },
                                )
                              )
                                router.refresh();
                            }}
                          />
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Simulator products={products} rules={rules} vatRate={vatRate} />
        <Panel title="Price change history" description="Latest 100 changes" bodyClassName="p-0">
          <ul className="max-h-[420px] divide-y overflow-y-auto text-sm">
            {history.length === 0 && <li className="p-4 text-muted-foreground">No price changes yet.</li>}
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0">
                  {h.productId ? (
                    <Link
                      href={`/admin/products/${h.productId}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {h.name}
                    </Link>
                  ) : (
                    <span className="block truncate">{h.name}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {fmtDateTime(h.at)} · {h.reason}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <Money value={h.sell} className="font-medium" />
                  <span className="block text-xs text-muted-foreground">cost {formatGBP(h.cost)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Calculator className="size-3.5" /> Margin is calculated on the ex-VAT price after rounding, so VAT
        never counts as profit.
      </p>

      <RuleDialog
        open={open}
        onOpenChange={setOpen}
        rule={editing}
        categories={categories}
        brands={brands}
        skus={products.map((p) => ({ sku: p.sku, name: p.name }))}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
