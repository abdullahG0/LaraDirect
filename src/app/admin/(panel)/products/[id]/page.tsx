import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { PriceHistoryChart } from '@/components/admin/charts';
import { MarginText, Money, PageHeader, Panel, StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { ruleLabel } from '@/lib/admin/products';
import { requireAdminPage } from '@/lib/auth/admin';
import { calculatePrice, selectRule } from '@/lib/pricing/engine';
import { loadRules } from '@/lib/pricing/rules';
import { getSettings } from '@/lib/settings';
import { createServiceClient } from '@/lib/supabase/server';
import { MarginCalculator, ProductOverridesForm, SyncProductButton } from './product-forms';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data } = await createServiceClient()
    .from('products')
    .select('name')
    .eq('id', params.id)
    .maybeSingle();
  return { title: data?.name ?? 'Product' };
}

export default async function AdminProductPage({ params }: { params: { id: string } }) {
  await requireAdminPage('viewer');
  const db = createServiceClient();
  const { data: p } = await db.from('products').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  const [rules, settings, history] = await Promise.all([
    loadRules(db),
    getSettings(db),
    db
      .from('price_history')
      .select('cost_price_ex_vat, sell_price_inc_vat, reason, changed_at')
      .eq('product_id', p.id)
      .order('changed_at', { ascending: false })
      .limit(100),
  ]);
  const input = {
    sku: p.distributor_sku,
    brand: p.brand,
    category: p.category,
    costPriceExVat: Number(p.cost_price_ex_vat),
  };
  const live = calculatePrice(
    { ...input, priceOverrideIncVat: p.price_override_inc_vat },
    rules,
    settings.vatRate,
  );
  const rulePrice = calculatePrice(input, rules, settings.vatRate);
  const rule = selectRule(input, rules);
  const hist = history.data ?? [];
  const specs = (p.specs ?? {}) as Record<string, string>;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/products', label: 'Products' }}
        title={p.title_override ?? p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{p.distributor_sku}</span> · {p.brand} · {p.category}
            {p.subcategory && ` / ${p.subcategory}`} <StatusBadge status={p.stock_status} />
            {!p.is_published && <StatusBadge status="discontinued" label="unpublished" />}
          </span>
        }
        actions={
          <>
            {p.is_published && (
              <a
                href={`/p/${p.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1 rounded-md border px-3 text-sm hover:bg-accent"
              >
                View in store <ExternalLink className="size-3.5" />
              </a>
            )}
            <SyncProductButton sku={p.distributor_sku} />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel
            title="Pricing"
            description={`Rule: ${ruleLabel(rule)}${rule ? `, floor ${rule.minMarginPct}%` : ''}`}
          >
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Cost (ex VAT)</p>
                <p className="text-lg font-semibold">
                  <Money value={p.cost_price_ex_vat} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rule price (inc VAT)</p>
                <p className="text-lg font-semibold">
                  <Money value={rulePrice.sellPriceIncVat} />
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selling at (inc VAT)</p>
                <p className="text-lg font-semibold">
                  <Money value={live.sellPriceIncVat} />
                  {live.overridden && (
                    <span className="ml-1 text-xs font-normal text-amber-600">override</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className="text-lg font-semibold">
                  <MarginText pct={live.marginPct} floor={rule?.minMarginPct} />
                </p>
                {live.marginStatus !== 'ok' && (
                  <p className="text-xs text-red-600">
                    {live.marginStatus === 'negative' ? 'Selling at a loss' : 'Below margin floor'}
                  </p>
                )}
              </div>
            </div>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Price build-up
            </h3>
            <ol className="mt-2 divide-y rounded-lg border text-sm">
              {live.steps.map((s, i) => (
                <li key={i} className="flex justify-between px-3 py-1.5">
                  <span>{s.label}</span>
                  <Money value={s.value} />
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Price history" description={`${hist.length} change${hist.length === 1 ? '' : 's'}`}>
            <PriceHistoryChart
              data={[...hist].reverse().map((h) => ({
                at: h.changed_at ?? '',
                sell: Number(h.sell_price_inc_vat ?? 0),
                cost: Number(h.cost_price_ex_vat ?? 0),
              }))}
            />
            {hist.length > 0 && (
              <ul className="mt-3 max-h-48 divide-y overflow-y-auto text-sm">
                {hist.map((h, i) => (
                  <li key={i} className="flex justify-between gap-2 py-1.5">
                    <span className="text-muted-foreground">
                      {fmtDateTime(h.changed_at)} · {h.reason}
                    </span>
                    <span>
                      <Money value={h.sell_price_inc_vat} />{' '}
                      <span className="text-xs text-muted-foreground">
                        (cost <Money value={h.cost_price_ex_vat} />)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <ProductOverridesForm
            product={{
              id: p.id,
              name: p.name,
              description: p.description ?? '',
              titleOverride: p.title_override,
              descriptionOverride: p.description_override,
              priceOverrideIncVat:
                p.price_override_inc_vat === null ? null : Number(p.price_override_inc_vat),
              images: p.images ?? [],
              isPublished: p.is_published ?? false,
              featured: p.featured ?? false,
            }}
          />
        </div>

        <div className="space-y-4">
          <MarginCalculator
            cost={Number(p.cost_price_ex_vat)}
            vatRate={settings.vatRate}
            floorPct={rule?.minMarginPct ?? 0}
            current={live.sellPriceIncVat}
          />

          <Panel title="Distributor data" description="Read-only, from TD SYNNEX">
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {(p.images ?? []).map((src) => (
                <div key={src} className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image src={src} alt="" fill sizes="80px" className="object-contain" />
                </div>
              ))}
            </div>
            <dl className="space-y-1 text-sm">
              {[
                ['Name', p.name],
                ['MPN', p.mpn],
                ['EAN', p.ean],
                ['RRP (ex VAT)', p.rrp_ex_vat !== null ? `£${Number(p.rrp_ex_vat).toFixed(2)}` : '—'],
                ['Stock', `${p.stock_qty} (${p.stock_status.replace(/_/g, ' ')})`],
                ['ETA', p.eta ?? '—'],
                ['Warranty', p.warranty_months ? `${p.warranty_months} months` : '—'],
                ['Weight', p.weight_kg ? `${p.weight_kg} kg` : '—'],
                ['Last synced', fmtDateTime(p.last_synced_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Specs
            </h3>
            <dl className="mt-1 space-y-1 text-sm">
              {Object.entries(specs).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Tags: {(p.tags ?? []).join(', ') || '—'} ·{' '}
              <Link href="/admin/pricing" className="underline">
                Pricing rules
              </Link>
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
