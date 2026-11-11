import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/components/admin/data-table/csv';
import { diffValues } from '@/lib/admin/diff';
import { aggregateDaily, aggregateKpis, aggregateTop, type MetricOrder } from '@/lib/admin/metrics';
import { buildReport, marginBuckets, weekStart, type ReportLine } from '@/lib/admin/reports';
import { canMoveReturn } from '@/lib/admin/returns';
import { can, hasRole } from '@/lib/auth/roles';
import { redact, withLogging, type LogEntry } from '@/lib/distributor/logging';
import { mapDistributorStatus } from '@/lib/orders/poll';
import { nextAttemptDelayMs } from '@/lib/orders/submit';
import { applyRuleChange } from '@/lib/pricing/rules';
import type { PricingRule } from '@/lib/pricing/engine';
import { rateLimit } from '@/lib/utils/rate-limit';

describe('roles (acceptance #7)', () => {
  it('support cannot edit pricing; viewer cannot mutate anything', () => {
    expect(can('support', 'pricing.manage')).toBe(false);
    expect(can('support', 'orders.manage')).toBe(true);
    for (const p of [
      'orders.manage',
      'products.manage',
      'pricing.manage',
      'sync.run',
      'settings.manage',
      'users.manage',
      'returns.manage',
      'customers.manage',
    ] as const) {
      expect(can('viewer', p)).toBe(false);
    }
    expect(can('admin', 'users.manage')).toBe(false);
    expect(can('owner', 'users.manage')).toBe(true);
    expect(hasRole(null, 'viewer')).toBe(false);
  });
});

describe('order helpers', () => {
  it('backs off 1, 5, 15 minutes', () => {
    expect([1, 2, 3, 4].map(nextAttemptDelayMs)).toEqual([60_000, 300_000, 900_000, 900_000]);
  });
  it('maps distributor statuses', () => {
    expect(mapDistributorStatus('received')).toBeNull();
    expect(mapDistributorStatus('rejected')).toBe('failed');
    expect(mapDistributorStatus('shipped')).toBe('shipped');
  });
});

describe('distributor logging', () => {
  it('redacts secrets and contact details and summarises long arrays', () => {
    const r = redact({
      clientSecret: 'x',
      token: 'y',
      shipTo: { email: 'a@b.c', phone: '07700', city: 'Leeds' },
      list: Array.from({ length: 30 }, (_, i) => i),
    }) as Record<string, unknown>;
    expect(r.clientSecret).toBe('[redacted]');
    expect(r.token).toBe('[redacted]');
    expect(r.shipTo).toEqual({ email: '[redacted]', phone: '[redacted]', city: 'Leeds' });
    expect(r.list).toMatchObject({ count: 30 });
  });

  it('logs successful and failing calls without changing results', async () => {
    const entries: LogEntry[] = [];
    const inner = {
      name: 'fake',
      listProducts: async () => ({ items: [] }),
      getProduct: async () => null,
      getPriceStock: async (skus: string[]) =>
        skus.map((sku) => ({
          sku,
          costPriceExVat: 1,
          stockQty: 1,
          stockStatus: 'in_stock' as const,
          fetchedAt: '',
        })),
      placeOrder: async (_req: unknown) => {
        throw new Error('boom');
      },
      getOrderStatus: async (_id: string) => {
        throw new Error('nope');
      },
    };
    const d = withLogging(inner, (e) => {
      entries.push(e);
    });
    expect(await d.getPriceStock(['A'])).toHaveLength(1);
    await expect(d.placeOrder({} as never)).rejects.toThrow('boom');
    expect(d.name).toBe('fake');
    expect(entries.map((e) => [e.method, e.status])).toEqual([
      ['getPriceStock', 'ok'],
      ['placeOrder', 'error'],
    ]);
  });
});

describe('rule change previews', () => {
  const rules: PricingRule[] = [
    {
      id: 'g',
      scope: 'global',
      scopeValue: null,
      markupType: 'percent',
      markupValue: 8,
      minMarginPct: 3,
      minMarginAmount: 0,
      rounding: 'x.99',
      priority: 0,
      isActive: true,
    },
  ];
  it('applies create, update and delete in memory', () => {
    const input = {
      scope: 'brand' as const,
      scopeValue: 'Apple',
      markupType: 'percent' as const,
      markupValue: 3,
      minMarginPct: 2,
      minMarginAmount: 0,
      rounding: 'x.99' as const,
      priority: 0,
      isActive: true,
    };
    expect(applyRuleChange(rules, { action: 'create', rule: input })).toHaveLength(2);
    expect(
      applyRuleChange(rules, {
        action: 'update',
        id: 'g',
        rule: { ...input, scope: 'global', scopeValue: null },
      })[0]!.markupValue,
    ).toBe(3);
    expect(applyRuleChange(rules, { action: 'delete', id: 'g' })).toHaveLength(0);
  });
});

describe('metrics', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  const o = (daysAgo: number, status: string, total: number, profit: number): MetricOrder => ({
    id: `${daysAgo}-${status}-${total}`,
    created_at: new Date(now.getTime() - daysAgo * 86400_000).toISOString(),
    status,
    total_inc_vat: total,
    subtotal_inc_vat: total,
    discount_inc_vat: 0,
    cost_total_ex_vat: 0,
    gross_profit: profit,
  });
  const orders = [
    o(0, 'delivered', 120, 10),
    o(3, 'shipped', 60, 5),
    o(20, 'delivered', 240, 20),
    o(40, 'delivered', 999, 99),
    o(1, 'cancelled', 500, 50),
    o(0, 'pending_payment', 70, 7),
  ];

  it('counts only real sales in KPI windows', () => {
    const k = aggregateKpis(orders, 0.2, now);
    expect(k.ordersToday).toBe(1);
    expect(k.orders7).toBe(2);
    expect(k.orders30).toBe(3);
    expect(k.revenue30).toBe(420);
    expect(k.profit30).toBe(35);
    expect(k.avgMargin30).toBe(10); // 35 / (420 / 1.2)
  });

  it('buckets daily series and top items', () => {
    const daily = aggregateDaily(orders, 30, now);
    expect(daily).toHaveLength(30);
    expect(daily.at(-1)!.revenue).toBe(120);
    const top = aggregateTop(
      [
        {
          order_id: 'a',
          product_id: 'p1',
          name: 'Headset',
          quantity: 10,
          unit_price_inc_vat: 20,
          unit_cost_ex_vat: 10,
        },
        {
          order_id: 'a',
          product_id: 'p2',
          name: 'Laptop',
          quantity: 1,
          unit_price_inc_vat: 300,
          unit_cost_ex_vat: 250,
        },
        {
          order_id: 'x',
          product_id: 'p2',
          name: 'Laptop',
          quantity: 5,
          unit_price_inc_vat: 300,
          unit_cost_ex_vat: 250,
        },
      ],
      new Set(['a']),
      (id) => (id === 'p1' ? 'Audio' : 'Laptops'),
    );
    expect(top.categories[0]).toEqual({ name: 'Laptops', revenue: 300 });
    expect(top.products.map((p) => p.name)).toEqual(['Laptop', 'Headset']);
  });
});

describe('reports', () => {
  const line = (createdAt: string, category: string, revenue: number, cost: number): ReportLine => ({
    orderId: createdAt + category,
    createdAt,
    category,
    brand: 'B',
    product: 'P',
    quantity: 1,
    revenueIncVat: revenue,
    costExVat: cost,
  });
  it('groups by week and category with ex-VAT profit', () => {
    const lines = [
      line('2026-11-02T10:00:00Z', 'Audio', 120, 80),
      line('2026-11-04T10:00:00Z', 'Audio', 60, 40),
      line('2026-11-10T10:00:00Z', 'Laptops', 600, 480),
    ];
    expect(weekStart('2026-11-04T10:00:00Z')).toBe('2026-11-02');
    const byWeek = buildReport(lines, 'week', 0.2);
    expect(byWeek.map((r) => r.key)).toEqual(['2026-11-02', '2026-11-09']);
    expect(byWeek[0]).toMatchObject({
      revenueIncVat: 180,
      revenueExVat: 150,
      cost: 120,
      profit: 30,
      marginPct: 20,
      orders: 2,
    });
    expect(buildReport(lines, 'category', 0.2)[0]!.key).toBe('Laptops');
  });
  it('builds margin histogram buckets', () => {
    const b = marginBuckets([-1, 0, 3, 3.1, 50]);
    expect(b[0]).toEqual({ label: '<0%', value: 1 });
    expect(b[1]!.value).toBe(1);
    expect(b[2]!.value).toBe(2);
    expect(b.at(-1)!.value).toBe(1);
  });
});

describe('returns flow', () => {
  it('only moves forward', () => {
    expect(canMoveReturn('requested', 'authorised')).toBe(true);
    expect(canMoveReturn('requested', 'refunded')).toBe(false);
    expect(canMoveReturn('refunded', 'requested')).toBe(false);
  });
});

describe('audit diff', () => {
  it('lists changed fields only', () => {
    expect(diffValues({ a: 1, b: { c: 2, d: 3 } }, { a: 1, b: { c: 2, d: 4 }, e: 5 })).toEqual([
      { path: 'b.d', before: 3, after: 4 },
      { path: 'e', before: undefined, after: 5 },
    ]);
    expect(diffValues(null, { x: 1 })).toEqual([{ path: 'x', before: undefined, after: 1 }]);
  });
});

describe('csv', () => {
  it('quotes and guards against formula injection', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell(-5)).toBe('-5');
    expect(toCsv(['x'], [[1]])).toBe('﻿x\r\n1\r\n');
  });
});

describe('rate limit', () => {
  it('blocks after the limit within a window', () => {
    const key = `t-${Math.random()}`;
    const results = Array.from({ length: 4 }, () => rateLimit(key, 3, 1000, 0).ok);
    expect(results).toEqual([true, true, true, false]);
    expect(rateLimit(key, 3, 1000, 2000).ok).toBe(true);
  });
});
