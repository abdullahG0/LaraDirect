// Sales and profit reports (step 7.2). `buildReport` is pure; `loadReportLines` fetches rows.
import type { Db } from '@/lib/supabase/db';
import { round2 } from '@/lib/utils/money';
import { SALE_STATUSES } from './metrics';

export const GROUPS = ['day', 'week', 'month', 'category', 'brand', 'product'] as const;
export type ReportGroup = (typeof GROUPS)[number];

export interface ReportLine {
  orderId: string;
  createdAt: string;
  category: string;
  brand: string;
  product: string;
  quantity: number;
  /** Line revenue inc VAT after this order's discount was shared across its lines. */
  revenueIncVat: number;
  costExVat: number;
}

export interface ReportRow {
  key: string;
  label: string;
  orders: number;
  units: number;
  revenueIncVat: number;
  revenueExVat: number;
  cost: number;
  profit: number;
  marginPct: number;
}

/** Monday-based ISO week start, as YYYY-MM-DD. */
export function weekStart(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function keyFor(l: ReportLine, group: ReportGroup): { key: string; label: string } {
  switch (group) {
    case 'day':
      return { key: l.createdAt.slice(0, 10), label: l.createdAt.slice(0, 10) };
    case 'week': {
      const w = weekStart(l.createdAt);
      return { key: w, label: `w/c ${w}` };
    }
    case 'month':
      return { key: l.createdAt.slice(0, 7), label: l.createdAt.slice(0, 7) };
    case 'category':
      return { key: l.category, label: l.category };
    case 'brand':
      return { key: l.brand, label: l.brand };
    case 'product':
      return { key: l.product, label: l.product };
  }
}

export function buildReport(lines: ReportLine[], group: ReportGroup, vatRate: number): ReportRow[] {
  const acc = new Map<string, ReportRow & { orderIds: Set<string> }>();
  for (const l of lines) {
    const { key, label } = keyFor(l, group);
    const r = acc.get(key) ?? {
      key,
      label,
      orders: 0,
      units: 0,
      revenueIncVat: 0,
      revenueExVat: 0,
      cost: 0,
      profit: 0,
      marginPct: 0,
      orderIds: new Set<string>(),
    };
    r.orderIds.add(l.orderId);
    r.units += l.quantity;
    r.revenueIncVat += l.revenueIncVat;
    r.cost += l.costExVat;
    acc.set(key, r);
  }
  const rows = [...acc.values()].map(({ orderIds, ...r }) => {
    const ex = r.revenueIncVat / (1 + vatRate);
    const profit = ex - r.cost;
    return {
      ...r,
      orders: orderIds.size,
      revenueIncVat: round2(r.revenueIncVat),
      revenueExVat: round2(ex),
      cost: round2(r.cost),
      profit: round2(profit),
      marginPct: ex > 0 ? round2((profit / ex) * 100) : 0,
    };
  });
  const timeBased = group === 'day' || group === 'week' || group === 'month';
  return rows.sort((a, b) => (timeBased ? a.key.localeCompare(b.key) : b.revenueIncVat - a.revenueIncVat));
}

export async function loadReportLines(db: Db, from: string, to: string): Promise<ReportLine[]> {
  const { data: orders } = await db
    .from('orders')
    .select('id, created_at, status, subtotal_inc_vat, discount_inc_vat')
    .gte('created_at', from)
    .lte('created_at', to)
    .limit(20000);
  const sales = (orders ?? []).filter((o) => SALE_STATUSES.has(o.status));
  const byId = new Map(sales.map((o) => [o.id, o]));
  const lines: ReportLine[] = [];
  const ids = [...byId.keys()];
  for (let i = 0; i < ids.length; i += 200) {
    const { data: items } = await db
      .from('order_items')
      .select('order_id, name, quantity, unit_price_inc_vat, unit_cost_ex_vat, products(brand, category)')
      .in('order_id', ids.slice(i, i + 200));
    for (const it of items ?? []) {
      const o = byId.get(it.order_id!)!;
      const sub = Number(o.subtotal_inc_vat ?? 0);
      const share = sub > 0 ? 1 - Number(o.discount_inc_vat ?? 0) / sub : 1;
      const qty = it.quantity ?? 0;
      const p = it.products as { brand: string; category: string } | null;
      lines.push({
        orderId: o.id,
        createdAt: o.created_at ?? '',
        category: p?.category ?? 'Other',
        brand: p?.brand ?? 'Other',
        product: it.name ?? '—',
        quantity: qty,
        revenueIncVat: Number(it.unit_price_inc_vat ?? 0) * qty * share,
        costExVat: Number(it.unit_cost_ex_vat ?? 0) * qty,
      });
    }
  }
  return lines;
}

/** Current catalogue margin distribution in 2.5-point buckets (published products). */
export function marginBuckets(margins: number[], step = 2.5, max = 40): { label: string; value: number }[] {
  const n = Math.ceil(max / step);
  const buckets = Array.from({ length: n + 2 }, (_, i) => ({
    label: i === 0 ? '<0%' : i === n + 1 ? `${max}%+` : `${((i - 1) * step).toFixed(1).replace('.0', '')}%`,
    value: 0,
  }));
  for (const m of margins) {
    const idx = m < 0 ? 0 : m >= max ? n + 1 : Math.floor(m / step) + 1;
    buckets[idx]!.value++;
  }
  return buckets;
}
