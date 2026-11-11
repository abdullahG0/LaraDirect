// Shared contract suite (spec §4.6). Runs against ANY Distributor implementation.
import { describe, expect, it } from 'vitest';
import { DistributorError, type Distributor, type PlaceOrderRequest } from '@/lib/distributor';

const shipTo: PlaceOrderRequest['shipTo'] = {
  name: 'Contract Test',
  line1: '1 Test Street',
  city: 'Leeds',
  postcode: 'LS1 1AA',
  country: 'GB',
  phone: '01130000000',
  email: 'contract@example.test',
};

export function runDistributorContract(name: string, make: () => Distributor) {
  describe(`Distributor contract: ${name}`, () => {
    it('lists products with required fields', async () => {
      const d = make();
      const { items } = await d.listProducts({ limit: 10 });
      expect(items.length).toBeGreaterThan(0);
      for (const p of items) {
        expect(p.sku).toBeTruthy();
        expect(p.brand).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.costPriceExVat).toBeGreaterThan(0);
        expect(p.stockQty).toBeGreaterThanOrEqual(0);
      }
    });

    it('paginates without duplicates', async () => {
      const d = make();
      const first = await d.listProducts({ limit: 5 });
      expect(first.nextCursor).toBeDefined();
      const second = await d.listProducts({ limit: 5, cursor: first.nextCursor });
      const skus = new Set([...first.items, ...second.items].map((p) => p.sku));
      expect(skus.size).toBe(first.items.length + second.items.length);
    });

    it('returns null for an unknown SKU', async () => {
      expect(await make().getProduct('DOES-NOT-EXIST')).toBeNull();
    });

    it('returns batch price/stock for each SKU', async () => {
      const d = make();
      const { items } = await d.listProducts({ limit: 3 });
      const ps = await d.getPriceStock(items.map((p) => p.sku));
      expect(ps.map((x) => x.sku).sort()).toEqual(items.map((p) => p.sku).sort());
    });

    it('placeOrder is idempotent on idempotencyKey', async () => {
      const d = make();
      const { items } = await d.listProducts({ limit: 50 });
      const p = items.find((x) => x.stockStatus === 'in_stock');
      if (!p) throw new Error('need an in-stock product');
      const req: PlaceOrderRequest = {
        reference: `CT-${Date.now()}`,
        idempotencyKey: `ct-${Date.now()}`,
        lines: [{ sku: p.sku, quantity: 1, expectedCostExVat: p.costPriceExVat }],
        shipTo,
        dropship: true,
        blindShipment: true,
      };
      const a = await d.placeOrder(req);
      const b = await d.placeOrder(req);
      expect(b.distributorOrderId).toBe(a.distributorOrderId);
    });

    it('rejects out-of-stock lines with OUT_OF_STOCK (non-retryable)', async () => {
      const d = make();
      const { items } = await d.listProducts({ limit: 500 });
      const p = items.find((x) => x.stockStatus === 'out_of_stock');
      if (!p) return; // real catalogue may not have one at test time
      await expect(
        d.placeOrder({
          reference: `CT-OOS-${Date.now()}`,
          idempotencyKey: `ct-oos-${Date.now()}`,
          lines: [{ sku: p.sku, quantity: 1, expectedCostExVat: p.costPriceExVat }],
          shipTo,
          dropship: true,
          blindShipment: true,
        }),
      ).rejects.toMatchObject({ code: 'OUT_OF_STOCK', retryable: false } satisfies Partial<DistributorError>);
    });

    it('throws PRICE_CHANGED (retryable) when expected cost is well off the live cost', async () => {
      const d = make();
      const { items } = await d.listProducts({ limit: 50 });
      const p = items.find((x) => x.stockStatus === 'in_stock');
      if (!p) throw new Error('need an in-stock product');
      await expect(
        d.placeOrder({
          reference: `CT-PC-${Date.now()}`,
          idempotencyKey: `ct-pc-${Date.now()}`,
          lines: [{ sku: p.sku, quantity: 1, expectedCostExVat: Math.round(p.costPriceExVat * 0.5) }],
          shipTo,
          dropship: true,
          blindShipment: true,
        }),
      ).rejects.toMatchObject({ code: 'PRICE_CHANGED', retryable: true });
    });

    it('reports a known status for a freshly placed order', async () => {
      const d = make();
      const { items } = await d.listProducts({ limit: 50 });
      const p = items.find((x) => x.stockStatus === 'in_stock');
      if (!p) throw new Error('need an in-stock product');
      const placed = await d.placeOrder({
        reference: `CT-ST-${Date.now()}`,
        idempotencyKey: `ct-st-${Date.now()}`,
        lines: [{ sku: p.sku, quantity: 1, expectedCostExVat: p.costPriceExVat }],
        shipTo,
        dropship: true,
        blindShipment: true,
      });
      const status = await d.getOrderStatus(placed.distributorOrderId);
      expect(status.distributorOrderId).toBe(placed.distributorOrderId);
      expect(['received', 'confirmed', 'backordered']).toContain(status.status);
      expect(Array.isArray(status.shipments)).toBe(true);
    });

    it('errors with a DistributorError for unknown orders', async () => {
      await expect(make().getOrderStatus('NOPE-123')).rejects.toBeInstanceOf(DistributorError);
    });
  });
}
