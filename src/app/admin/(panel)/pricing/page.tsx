import { PageHeader } from '@/components/admin/ui';
import { requireAdminPage } from '@/lib/auth/admin';
import { CATEGORIES } from '@/lib/catalogue/categories';
import { loadRules } from '@/lib/pricing/rules';
import { getSettings } from '@/lib/settings';
import { createServiceClient } from '@/lib/supabase/server';
import { PricingWorkspace } from './pricing-workspace';

export const metadata = { title: 'Pricing' };
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  await requireAdminPage('viewer');
  const db = createServiceClient();
  const [rules, settings, products, history] = await Promise.all([
    loadRules(db),
    getSettings(db),
    db
      .from('products')
      .select('id, name, distributor_sku, brand, category, cost_price_ex_vat, price_override_inc_vat')
      .order('name')
      .limit(5000),
    db
      .from('price_history')
      .select('id, product_id, cost_price_ex_vat, sell_price_inc_vat, reason, changed_at, products(name)')
      .order('changed_at', { ascending: false })
      .limit(100),
  ]);
  const productRows = products.data ?? [];
  return (
    <>
      <PageHeader
        title="Pricing"
        description="Rules decide every sell price: most specific wins (SKU › brand › category › global), then highest priority."
      />
      <PricingWorkspace
        rules={rules}
        vatRate={settings.vatRate}
        categories={CATEGORIES.map((c) => c.name)}
        brands={[...new Set(productRows.map((p) => p.brand))].sort()}
        products={productRows.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.distributor_sku,
          brand: p.brand,
          category: p.category,
          costPriceExVat: Number(p.cost_price_ex_vat),
          priceOverrideIncVat: p.price_override_inc_vat === null ? null : Number(p.price_override_inc_vat),
        }))}
        history={(history.data ?? []).map((h) => ({
          id: h.id,
          productId: h.product_id,
          name: (h.products as { name: string } | null)?.name ?? '—',
          cost: Number(h.cost_price_ex_vat ?? 0),
          sell: Number(h.sell_price_inc_vat ?? 0),
          reason: h.reason ?? '',
          at: h.changed_at ?? '',
        }))}
      />
    </>
  );
}
