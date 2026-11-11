// Admin dashboard metrics (step 6.2). Aggregation is pure (aggregate*) and unit-tested; the
// loader just fetches rows.
import type { Db } from '@/lib/supabase/db';
import { calculatePrice } from '@/lib/pricing/engine';
import { loadRules } from '@/lib/pricing/rules';
import { getSettings } from '@/lib/settings';
import { round2 } from '@/lib/utils/money';

/** Statuses that count as a sale (money taken and not given back). */
export const SALE_STATUSES = new Set([
  'paid',
  'submitting',
  'submitted',
  'confirmed',
  'backordered',
  'partially_shipped',
  'shipped',
  'delivered',
  'failed',
]);

export interface MetricOrder {
  id: string;
  created_at: string | null;
  status: string;
  total_inc_vat: number | null;
  subtotal_inc_vat: number | null;
  discount_inc_vat: number | null;
  cost_total_ex_vat: number | null;
  gross_profit: number | null;
}

export interface MetricItem {
  order_id: string | null;
  product_id: string | null;
  name: string | null;
  quantity: number | null;
  unit_price_inc_vat: number | null;
  unit_cost_ex_vat: number | null;
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function aggregateKpis(orders: MetricOrder[], vatRate: number, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const since = (days: number) => now.getTime() - days * 86400_000;
  const sales = orders.filter((o) => SALE_STATUSES.has(o.status));
  const inWindow = (o: MetricOrder, from: number) => o.created_at && new Date(o.created_at).getTime() >= from;

  const s30 = sales.filter((o) => inWindow(o, since(30)));
  const revenue30 = round2(s30.reduce((s, o) => s + Number(o.total_inc_vat ?? 0), 0));
  const profit30 = round2(s30.reduce((s, o) => s + Number(o.gross_profit ?? 0), 0));
  const goodsEx30 = s30.reduce(
    (s, o) => s + (Number(o.subtotal_inc_vat ?? 0) - Number(o.discount_inc_vat ?? 0)) / (1 + vatRate),
    0,
  );

  return {
    ordersToday: sales.filter((o) => inWindow(o, startOfToday.getTime())).length,
    orders7: sales.filter((o) => inWindow(o, since(7))).length,
    orders30: s30.length,
    revenue30,
    profit30,
    avgMargin30: goodsEx30 > 0 ? round2((profit30 / goodsEx30) * 100) : 0,
    avgOrderValue30: s30.length ? round2(revenue30 / s30.length) : 0,
  };
}

export function aggregateDaily(orders: MetricOrder[], days = 30, now = new Date()) {
  const buckets = new Map<string, { date: string; revenue: number; profit: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    buckets.set(dayKey(d), { date: dayKey(d), revenue: 0, profit: 0, orders: 0 });
  }
  for (const o of orders) {
    if (!SALE_STATUSES.has(o.status) || !o.created_at) continue;
    const b = buckets.get(o.created_at.slice(0, 10));
    if (!b) continue;
    b.revenue = round2(b.revenue + Number(o.total_inc_vat ?? 0));
    b.profit = round2(b.profit + Number(o.gross_profit ?? 0));
    b.orders++;
  }
  return [...buckets.values()];
}

export function aggregateByStatus(orders: MetricOrder[]) {
  const counts = new Map<string, number>();
  for (const o of orders) counts.set(o.status, (counts.get(o.status) ?? 0) + 1);
  return [...counts].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
}

export function aggregateTop(
  items: MetricItem[],
  saleOrderIds: Set<string>,
  categoryOf: (productId: string | null) => string,
  limit = 6,
) {
  const byCat = new Map<string, number>();
  const byProduct = new Map<string, { name: string; revenue: number; units: number }>();
  for (const i of items) {
    if (!i.order_id || !saleOrderIds.has(i.order_id)) continue;
    const rev = Number(i.unit_price_inc_vat ?? 0) * (i.quantity ?? 0);
    const cat = categoryOf(i.product_id);
    byCat.set(cat, round2((byCat.get(cat) ?? 0) + rev));
    const key = i.product_id ?? i.name ?? '?';
    const p = byProduct.get(key) ?? { name: i.name ?? '?', revenue: 0, units: 0 };
    p.revenue = round2(p.revenue + rev);
    p.units += i.quantity ?? 0;
    byProduct.set(key, p);
  }
  return {
    categories: [...byCat]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit),
    products: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit),
  };
}

export interface AttentionItem {
  kind:
    'failed' | 'backordered' | 'margin_alert' | 'below_floor' | 'out_of_stock' | 'sync_error' | 'retrying';
  title: string;
  detail: string;
  href: string;
}

export async function getDashboardData(db: Db, now = new Date()) {
  const since = new Date(now.getTime() - 90 * 86400_000).toISOString();
  const [settings, ordersRes, rules, productsRes, syncRes, eventsRes, auditRes] = await Promise.all([
    getSettings(db),
    db
      .from('orders')
      .select(
        'id, order_number, email, created_at, status, total_inc_vat, subtotal_inc_vat, discount_inc_vat, cost_total_ex_vat, gross_profit, last_error, margin_alert, next_attempt_at',
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000),
    loadRules(db),
    db
      .from('products')
      .select(
        'id, name, distributor_sku, brand, category, cost_price_ex_vat, price_override_inc_vat, stock_status, is_published, featured',
      )
      .limit(5000),
    db
      .from('sync_runs')
      .select('id, started_at, finished_at, errors, type, log')
      .order('started_at', { ascending: false })
      .limit(10),
    db
      .from('order_events')
      .select('id, order_id, type, message, actor, created_at')
      .order('created_at', { ascending: false })
      .limit(15),
    db
      .from('audit_log')
      .select('id, action, entity, entity_id, created_at, actor')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  const orders = ordersRes.data ?? [];
  const products = productsRes.data ?? [];
  const saleIds = new Set(
    orders
      .filter(
        (o) =>
          SALE_STATUSES.has(o.status) &&
          o.created_at &&
          new Date(o.created_at).getTime() >= now.getTime() - 30 * 86400_000,
      )
      .map((o) => o.id),
  );

  const items: MetricItem[] = [];
  const ids = [...saleIds];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from('order_items')
      .select('order_id, product_id, name, quantity, unit_price_inc_vat, unit_cost_ex_vat')
      .in('order_id', ids.slice(i, i + 200));
    items.push(...(data ?? []));
  }
  const catById = new Map(products.map((p) => [p.id, p.category]));

  // Needs attention (spec §11.1).
  const attention: AttentionItem[] = [];
  for (const o of orders.filter((x) => x.status === 'failed').slice(0, 10)) {
    attention.push({
      kind: 'failed',
      title: `${o.order_number} failed to submit`,
      detail: o.last_error ?? 'Unknown error',
      href: `/admin/orders/${o.id}`,
    });
  }
  for (const o of orders.filter((x) => x.status === 'submitting' && x.next_attempt_at).slice(0, 5)) {
    attention.push({
      kind: 'retrying',
      title: `${o.order_number} retrying submission`,
      detail: o.last_error ?? '',
      href: `/admin/orders/${o.id}`,
    });
  }
  for (const o of orders.filter((x) => x.status === 'backordered').slice(0, 5)) {
    attention.push({
      kind: 'backordered',
      title: `${o.order_number} is backordered`,
      detail: 'Waiting for stock at TD SYNNEX',
      href: `/admin/orders/${o.id}`,
    });
  }
  for (const o of orders.filter((x) => x.margin_alert && SALE_STATUSES.has(x.status)).slice(0, 5)) {
    attention.push({
      kind: 'margin_alert',
      title: `${o.order_number} sold below margin floor`,
      detail: 'Live cost rose after pricing',
      href: `/admin/orders/${o.id}`,
    });
  }
  let belowFloor = 0;
  for (const p of products) {
    if (!p.is_published) continue;
    const r = calculatePrice(
      {
        sku: p.distributor_sku,
        brand: p.brand,
        category: p.category,
        costPriceExVat: Number(p.cost_price_ex_vat),
        priceOverrideIncVat: p.price_override_inc_vat,
      },
      rules,
      settings.vatRate,
    );
    if (r.marginStatus !== 'ok') {
      belowFloor++;
      if (belowFloor <= 5) {
        attention.push({
          kind: 'below_floor',
          title: `${p.name}`,
          detail: `Margin ${r.marginPct}% is below its ${r.overridden ? 'floor (manual price)' : 'floor'}`,
          href: `/admin/products/${p.id}`,
        });
      }
    }
  }
  const oosFeatured = products.filter(
    (p) => p.is_published && p.featured && p.stock_status === 'out_of_stock',
  );
  for (const p of oosFeatured.slice(0, 5)) {
    attention.push({
      kind: 'out_of_stock',
      title: `${p.name} is out of stock`,
      detail: 'Featured on the home page',
      href: `/admin/products/${p.id}`,
    });
  }
  const lastSync = syncRes.data?.[0];
  if (lastSync && (lastSync.errors ?? 0) > 0) {
    attention.push({
      kind: 'sync_error',
      title: `Last sync had ${lastSync.errors} error${lastSync.errors === 1 ? '' : 's'}`,
      detail: lastSync.log?.split('\n').find((l) => /fail/i.test(l)) ?? '',
      href: '/admin/sync',
    });
  }

  const orderNumberById = new Map(orders.map((o) => [o.id, o.order_number]));
  const activity = [
    ...(eventsRes.data ?? []).map((e) => ({
      at: e.created_at ?? '',
      text: `${orderNumberById.get(e.order_id ?? '') ?? 'Order'}: ${e.message ?? e.type}`,
      href: e.order_id ? `/admin/orders/${e.order_id}` : '/admin/orders',
      actor: e.actor ?? 'system',
    })),
    ...(auditRes.data ?? []).map((a) => ({
      at: a.created_at ?? '',
      text: `${a.action} ${a.entity}${a.entity_id ? ` ${a.entity_id.slice(0, 8)}` : ''}`,
      href: '/admin/audit',
      actor: 'admin',
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 15);

  return {
    kpis: { ...aggregateKpis(orders, settings.vatRate, now), needsAttention: attention.length, belowFloor },
    daily: aggregateDaily(orders, 30, now),
    byStatus: aggregateByStatus(
      orders.filter(
        (o) => o.created_at && new Date(o.created_at).getTime() >= now.getTime() - 30 * 86400_000,
      ),
    ),
    top: aggregateTop(items, saleIds, (id) => (id ? (catById.get(id) ?? 'Other') : 'Other')),
    attention,
    activity,
    lastSync: lastSync ?? null,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
