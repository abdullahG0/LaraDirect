import { describe, expect, it } from 'vitest';
import catalogue from '@data/mock-catalogue.json';
import { MockTdSynnexAdapter, type MockAdapterOptions } from '@/lib/distributor/mock-adapter';
import { MemoryStateStore } from '@/lib/distributor/mock/state-store';
import type { MockCatalogueItem } from '@/lib/distributor/mock/catalogue-types';
import type { PlaceOrderRequest } from '@/lib/distributor';

const items = catalogue as unknown as MockCatalogueItem[];
const START = new Date('2026-11-10T09:00:00Z');

function setup(extra: Partial<MockAdapterOptions> = {}) {
  let now = START;
  const clock = {
    advanceMinutes: (m: number) => {
      now = new Date(now.getTime() + m * 60_000);
    },
  };
  const adapter = new MockTdSynnexAdapter({
    store: new MemoryStateStore(),
    latencyMs: [0, 0],
    failRate: 0,
    rejectSkus: [],
    timeScale: 1,
    now: () => now,
    ...extra,
  });
  return { adapter, clock };
}

let n = 0;
function order(lines: Array<{ sku: string; cost: number; qty?: number }>): PlaceOrderRequest {
  n++;
  return {
    reference: `LD-T${n}`,
    idempotencyKey: `key-${n}`,
    lines: lines.map((l) => ({ sku: l.sku, quantity: l.qty ?? 1, expectedCostExVat: l.cost })),
    shipTo: {
      name: 'Ms Test',
      line1: '1 School Lane',
      city: 'York',
      postcode: 'YO1 7HH',
      country: 'GB',
      phone: '01904000000',
      email: 't@example.test',
    },
    dropship: true,
    blindShipment: true,
  };
}

const inStock = (cat: string) => items.find((p) => p.category === cat && p.stockStatus === 'in_stock')!;

describe('MockTdSynnexAdapter', () => {
  it('never exposes mock-only metadata', async () => {
    const { adapter } = setup();
    const p = await adapter.getProduct(items[0]!.sku);
    expect(p).not.toHaveProperty('mock');
  });

  it('progresses received → confirmed → shipped → delivered over time', async () => {
    const { adapter, clock } = setup();
    const laptop = inStock('Laptops');
    const placed = await adapter.placeOrder(order([{ sku: laptop.sku, cost: laptop.costPriceExVat }]));
    expect(placed.status).toBe('received');

    expect((await adapter.getOrderStatus(placed.distributorOrderId)).status).toBe('received');
    clock.advanceMinutes(3);
    expect((await adapter.getOrderStatus(placed.distributorOrderId)).status).toBe('confirmed');
    clock.advanceMinutes(60);
    const shipped = await adapter.getOrderStatus(placed.distributorOrderId);
    expect(['shipped', 'delivered']).toContain(shipped.status);
    expect(shipped.shipments[0]?.trackingNumber).toBeTruthy();
    expect(shipped.shipments[0]?.lines[0]?.serialNumbers).toHaveLength(1);
    clock.advanceMinutes(180);
    expect((await adapter.getOrderStatus(placed.distributorOrderId)).status).toBe('delivered');
  });

  it('DEMO_TIME_SCALE speeds progression up', async () => {
    const { adapter, clock } = setup({ timeScale: 60 });
    const p = inStock('Peripherals');
    const placed = await adapter.placeOrder(order([{ sku: p.sku, cost: p.costPriceExVat }]));
    clock.advanceMinutes(4); // = 4 hours scaled
    expect((await adapter.getOrderStatus(placed.distributorOrderId)).status).toBe('delivered');
  });

  it('accepts backorder products as backordered with an ETA', async () => {
    const { adapter, clock } = setup();
    const bo = items.find((p) => p.stockStatus === 'backorder')!;
    const placed = await adapter.placeOrder(order([{ sku: bo.sku, cost: bo.costPriceExVat }]));
    expect(placed.status).toBe('backordered');
    expect(placed.lines[0]?.eta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    clock.advanceMinutes(5);
    expect((await adapter.getOrderStatus(placed.distributorOrderId)).status).toBe('backordered');
    clock.advanceMinutes(24 * 60);
    expect((await adapter.getOrderStatus(placed.distributorOrderId)).status).toBe('confirmed');
  });

  it('reserves stock on order and returns it on cancel', async () => {
    const { adapter } = setup();
    const p = inStock('Tablets');
    const before = (await adapter.getProduct(p.sku))!.stockQty;
    const placed = await adapter.placeOrder(order([{ sku: p.sku, cost: p.costPriceExVat, qty: 2 }]));
    expect((await adapter.getProduct(p.sku))!.stockQty).toBe(before - 2);
    expect(await adapter.cancelOrder(placed.distributorOrderId)).toEqual({ cancelled: true });
    expect((await adapter.getProduct(p.sku))!.stockQty).toBe(before);
    expect((await adapter.getOrderStatus(placed.distributorOrderId)).status).toBe('cancelled');
  });

  it('refuses to cancel once shipped', async () => {
    const { adapter, clock } = setup();
    const p = inStock('Peripherals');
    const placed = await adapter.placeOrder(order([{ sku: p.sku, cost: p.costPriceExVat }]));
    clock.advanceMinutes(120);
    const res = await adapter.cancelOrder(placed.distributorOrderId);
    expect(res.cancelled).toBe(false);
  });

  it('rejects SKUs listed in MOCK_REJECT_SKUS (non-retryable)', async () => {
    const p = inStock('Laptops');
    const { adapter } = setup({ rejectSkus: [p.sku] });
    await expect(adapter.placeOrder(order([{ sku: p.sku, cost: p.costPriceExVat }]))).rejects.toMatchObject({
      code: 'VALIDATION',
      retryable: false,
    });
  });

  it('injects retryable network failures at MOCK_FAIL_RATE', async () => {
    const { adapter } = setup({ failRate: 1 });
    await expect(adapter.getProduct(items[0]!.sku)).rejects.toMatchObject({
      code: 'NETWORK',
      retryable: true,
    });
  });

  it('rejects a reused PO reference with a different idempotency key', async () => {
    const { adapter } = setup();
    const p = inStock('Peripherals');
    const req = order([{ sku: p.sku, cost: p.costPriceExVat }]);
    await adapter.placeOrder(req);
    await expect(adapter.placeOrder({ ...req, idempotencyKey: 'other' })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('tick() drifts some prices and stock but never restocks permanent out-of-stock items', async () => {
    const { adapter } = setup();
    let price = 0;
    let stock = 0;
    for (let i = 0; i < 10; i++) {
      const r = await adapter.tick();
      price += r.priceChanges;
      stock += r.stockChanges;
    }
    expect(price).toBeGreaterThan(20); // ~5% of 200 per tick
    expect(stock).toBeGreaterThan(100); // ~15% of 200 per tick
    for (const p of items.filter((x) => x.mock.flags.includes('perma-oos'))) {
      expect((await adapter.getProduct(p.sku))!.stockStatus).toBe('out_of_stock');
    }
  });
});
