// MockTdSynnexAdapter (spec §4.3): behaves like TD SYNNEX, backed by data/mock-catalogue.json.
import catalogueJson from '@data/mock-catalogue.json';
import { round2 } from '@/lib/utils/money';
import type { MockCatalogueItem } from './mock/catalogue-types';
import { createDefaultStateStore, type MockStateStore } from './mock/state-store';
import { computeStatus, type MockOrder, type MockOrderLine } from './mock/timeline';
import {
  DistributorError,
  type Distributor,
  type DistributorProduct,
  type ListProductsParams,
  type OrderStatusResult,
  type PlaceOrderRequest,
  type PlaceOrderResult,
  type PriceStock,
  type StockStatus,
} from './types';

const CATALOGUE = catalogueJson as unknown as MockCatalogueItem[];
const SERIALISED_CATEGORIES = new Set(['Laptops', 'Tablets', 'Desktops & All-in-ones']);

interface Override {
  costPriceExVat?: number;
  stockQty?: number;
  stockStatus?: StockStatus;
  updatedAt: string;
}
type Overrides = Record<string, Override>;
type Orders = Record<string, MockOrder>;

export interface MockAdapterOptions {
  store?: MockStateStore;
  latencyMs?: [number, number];
  failRate?: number;
  rejectSkus?: string[];
  priceTolerancePct?: number;
  timeScale?: number;
  now?: () => Date;
  random?: () => number;
  catalogue?: MockCatalogueItem[];
}

const KEYS = { overrides: 'overrides', orders: 'orders', idempotency: 'idempotency' } as const;

function envNumber(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== '' && process.env[name] !== undefined ? v : fallback;
}

function envLatency(): [number, number] {
  const m = /^(\d+)-(\d+)$/.exec(process.env.MOCK_LATENCY_MS ?? '');
  return m ? [Number(m[1]), Number(m[2])] : [150, 600];
}

export function stockStatusForQty(qty: number): StockStatus {
  if (qty <= 0) return 'out_of_stock';
  if (qty <= 5) return 'low_stock';
  return 'in_stock';
}

export class MockTdSynnexAdapter implements Distributor {
  readonly name = 'TD SYNNEX (mock)';

  private readonly store: MockStateStore;
  private readonly latency: [number, number];
  private failRate: number;
  private rejectSkus: Set<string>;
  private readonly envFailRate: number;
  private readonly envRejectSkus: Set<string>;
  private readonly tolerancePct: number;
  private readonly timeScale: number;
  private readonly now: () => Date;
  private readonly random: () => number;
  private readonly catalogue: MockCatalogueItem[];
  private readonly bySku: Map<string, MockCatalogueItem>;

  constructor(opts: MockAdapterOptions = {}) {
    this.store = opts.store ?? createDefaultStateStore();
    this.latency = opts.latencyMs ?? envLatency();
    this.failRate = opts.failRate ?? envNumber('MOCK_FAIL_RATE', 0);
    this.rejectSkus = new Set(
      opts.rejectSkus ??
        (process.env.MOCK_REJECT_SKUS ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
    );
    this.envFailRate = this.failRate;
    this.envRejectSkus = new Set(this.rejectSkus);
    this.tolerancePct = opts.priceTolerancePct ?? envNumber('MOCK_PRICE_TOLERANCE_PCT', 1);
    this.timeScale = opts.timeScale ?? envNumber('DEMO_TIME_SCALE', 1);
    this.now = opts.now ?? (() => new Date());
    this.random = opts.random ?? Math.random;
    this.catalogue = [...(opts.catalogue ?? CATALOGUE)].sort((a, b) => a.sku.localeCompare(b.sku));
    this.bySku = new Map(this.catalogue.map((p) => [p.sku, p]));
  }

  // ── Read side ────────────────────────────────────────────────────────────

  async listProducts(
    params: ListProductsParams,
  ): Promise<{ items: DistributorProduct[]; nextCursor?: string }> {
    await this.simulateNetwork();
    const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
    const offset = params.cursor ? decodeCursor(params.cursor) : 0;
    const overrides = await this.overrides();
    let all = this.catalogue.map((p) => this.effective(p, overrides));
    if (params.category) all = all.filter((p) => p.category === params.category);
    if (params.updatedSince) {
      const since = new Date(params.updatedSince).getTime();
      all = all.filter((p) => new Date(p.updatedAt).getTime() > since);
    }
    const items = all.slice(offset, offset + limit);
    const next = offset + limit;
    return { items, nextCursor: next < all.length ? encodeCursor(next) : undefined };
  }

  async getProduct(sku: string): Promise<DistributorProduct | null> {
    await this.simulateNetwork();
    const base = this.bySku.get(sku);
    return base ? this.effective(base, await this.overrides()) : null;
  }

  async getPriceStock(skus: string[]): Promise<PriceStock[]> {
    await this.simulateNetwork();
    const overrides = await this.overrides();
    const fetchedAt = this.now().toISOString();
    return skus.flatMap((sku) => {
      const base = this.bySku.get(sku);
      if (!base) return [];
      const p = this.effective(base, overrides);
      return [
        {
          sku,
          costPriceExVat: p.costPriceExVat,
          stockQty: p.stockQty,
          stockStatus: p.stockStatus,
          eta: p.eta,
          fetchedAt,
        },
      ];
    });
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  async placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult> {
    await this.simulateNetwork();

    const idem = (await this.store.get<Record<string, string>>(KEYS.idempotency)) ?? {};
    const orders = (await this.store.get<Orders>(KEYS.orders)) ?? {};
    const existingId = idem[req.idempotencyKey];
    if (existingId && orders[existingId]) return this.toPlaceResult(orders[existingId]);

    this.validateRequest(req, orders);

    const overrides = await this.overrides();
    const lines: MockOrderLine[] = [];
    for (const line of req.lines) {
      const base = this.bySku.get(line.sku);
      if (!base)
        throw new DistributorError(`Unknown SKU ${line.sku}`, 'VALIDATION', false, { sku: line.sku });
      if (this.rejectSkus.has(line.sku)) {
        throw new DistributorError(
          `Order rejected by distributor: ${line.sku} cannot be supplied for dropship`,
          'VALIDATION',
          false,
          { sku: line.sku, rejected: true },
        );
      }
      const p = this.effective(base, overrides);

      const diffPct = (Math.abs(p.costPriceExVat - line.expectedCostExVat) / p.costPriceExVat) * 100;
      if (diffPct > this.tolerancePct) {
        throw new DistributorError(`Price changed for ${line.sku}`, 'PRICE_CHANGED', true, {
          sku: line.sku,
          expected: line.expectedCostExVat,
          current: p.costPriceExVat,
        });
      }

      const backordered = p.stockStatus === 'backorder';
      if (
        !backordered &&
        (p.stockStatus === 'out_of_stock' || p.stockStatus === 'discontinued' || p.stockQty < line.quantity)
      ) {
        throw new DistributorError(`Insufficient stock for ${line.sku}`, 'OUT_OF_STOCK', false, {
          sku: line.sku,
          requested: line.quantity,
          available: p.stockQty,
        });
      }

      lines.push({
        sku: line.sku,
        quantity: line.quantity,
        confirmedCostExVat: p.costPriceExVat,
        backordered,
        serialised:
          SERIALISED_CATEGORIES.has(base.category) &&
          base.mock.kind !== 'case' &&
          base.mock.kind !== 'pencil',
        eta: backordered ? p.eta : undefined,
      });
    }

    // Reserve stock for lines that ship from stock.
    const nowIso = this.now().toISOString();
    for (const l of lines.filter((x) => !x.backordered)) {
      const p = this.effective(this.bySku.get(l.sku)!, overrides);
      const qty = p.stockQty - l.quantity;
      overrides[l.sku] = {
        ...overrides[l.sku],
        stockQty: qty,
        stockStatus: stockStatusForQty(qty),
        updatedAt: nowIso,
      };
    }

    let id: string;
    do id = `TDS-SO-${Math.floor(10_000_000 + this.random() * 89_999_999)}`;
    while (orders[id]);

    const order: MockOrder = {
      distributorOrderId: id,
      reference: req.reference,
      idempotencyKey: req.idempotencyKey,
      createdAt: nowIso,
      lines,
    };
    orders[id] = order;
    idem[req.idempotencyKey] = id;
    await this.store.set(KEYS.orders, orders);
    await this.store.set(KEYS.idempotency, idem);
    await this.store.set(KEYS.overrides, overrides);
    return this.toPlaceResult(order);
  }

  async getOrderStatus(distributorOrderId: string): Promise<OrderStatusResult> {
    await this.simulateNetwork();
    const order = ((await this.store.get<Orders>(KEYS.orders)) ?? {})[distributorOrderId];
    if (!order) throw new DistributorError(`Unknown order ${distributorOrderId}`, 'VALIDATION', false);
    return computeStatus(order, this.now(), this.timeScale);
  }

  async cancelOrder(distributorOrderId: string): Promise<{ cancelled: boolean; reason?: string }> {
    await this.simulateNetwork();
    const orders = (await this.store.get<Orders>(KEYS.orders)) ?? {};
    const order = orders[distributorOrderId];
    if (!order) throw new DistributorError(`Unknown order ${distributorOrderId}`, 'VALIDATION', false);
    if (order.cancelledAt) return { cancelled: true };

    const { status } = computeStatus(order, this.now(), this.timeScale);
    if (!['received', 'confirmed', 'backordered'].includes(status)) {
      return { cancelled: false, reason: `Order is already ${status.replace('_', ' ')}` };
    }

    // Return reserved stock.
    const overrides = await this.overrides();
    const nowIso = this.now().toISOString();
    for (const l of order.lines.filter((x) => !x.backordered)) {
      const p = this.effective(this.bySku.get(l.sku)!, overrides);
      const qty = p.stockQty + l.quantity;
      overrides[l.sku] = {
        ...overrides[l.sku],
        stockQty: qty,
        stockStatus: stockStatusForQty(qty),
        updatedAt: nowIso,
      };
    }
    order.cancelledAt = nowIso;
    await this.store.set(KEYS.orders, orders);
    await this.store.set(KEYS.overrides, overrides);
    return { cancelled: true };
  }

  // ── Mock-only helpers ────────────────────────────────────────────────────

  /**
   * Failure-injection controls from the admin settings page (spec §11.1). `null` falls back to
   * the MOCK_FAIL_RATE / MOCK_REJECT_SKUS env values. Extra reject SKUs add to the env list.
   */
  configure(controls: { failRate?: number | null; rejectSkus?: string[] }): void {
    this.failRate = controls.failRate ?? this.envFailRate;
    this.rejectSkus = new Set([...this.envRejectSkus, ...(controls.rejectSkus ?? [])]);
  }

  /** Price/stock drift, called by the sync job before each run in mock mode (spec §4.3, §9). */
  async tick(): Promise<{ priceChanges: number; stockChanges: number }> {
    const overrides = await this.overrides();
    const nowIso = this.now().toISOString();
    const r = this.random;
    let priceChanges = 0;
    let stockChanges = 0;

    for (const base of this.catalogue) {
      const p = this.effective(base, overrides);
      if (p.stockStatus === 'discontinued') continue;
      const o: Override = { ...overrides[base.sku], updatedAt: nowIso };
      let changed = false;

      if (r() < 0.05) {
        const pct = 0.005 + r() * 0.025;
        const sign = r() < 0.6 ? 1 : -1; // costs drift up slightly more often than down
        o.costPriceExVat = round2(p.costPriceExVat * (1 + sign * pct));
        priceChanges++;
        changed = true;
      }

      const stockFixed = p.stockStatus === 'backorder' || base.mock.flags.includes('perma-oos');
      if (!stockFixed && r() < 0.15) {
        let qty = p.stockQty;
        if (qty === 0) qty = r() < 0.5 ? 5 + Math.floor(r() * 75) : 0;
        else if (r() < 0.06) qty = 0;
        else qty = Math.max(0, Math.round(qty * (0.6 + r() * 0.8)));
        if (qty !== p.stockQty) {
          o.stockQty = qty;
          o.stockStatus = stockStatusForQty(qty);
          stockChanges++;
          changed = true;
        }
      }

      if (changed) overrides[base.sku] = o;
    }

    await this.store.set(KEYS.overrides, overrides);
    return { priceChanges, stockChanges };
  }

  /** Clears all drift and mock orders (admin "reset demo"). */
  async reset(): Promise<void> {
    await this.store.set(KEYS.overrides, {});
    await this.store.set(KEYS.orders, {});
    await this.store.set(KEYS.idempotency, {});
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private async overrides(): Promise<Overrides> {
    return (await this.store.get<Overrides>(KEYS.overrides)) ?? {};
  }

  private effective(base: MockCatalogueItem, overrides: Overrides): DistributorProduct {
    const { mock, ...product } = base;
    const o = overrides[base.sku];
    const out: DistributorProduct = {
      ...product,
      specs: { ...product.specs },
      images: [...product.images],
      tags: product.tags ? [...product.tags] : undefined,
      ...(o?.costPriceExVat !== undefined && { costPriceExVat: o.costPriceExVat }),
      ...(o?.stockQty !== undefined && { stockQty: o.stockQty }),
      ...(o?.stockStatus !== undefined && { stockStatus: o.stockStatus }),
      ...(o && { updatedAt: o.updatedAt }),
    };
    if (out.stockStatus === 'backorder' && mock.etaDays !== undefined) {
      const eta = new Date(this.now());
      eta.setUTCDate(eta.getUTCDate() + mock.etaDays);
      out.eta = eta.toISOString().slice(0, 10);
    }
    return out;
  }

  private validateRequest(req: PlaceOrderRequest, orders: Orders) {
    const fail = (msg: string) => {
      throw new DistributorError(msg, 'VALIDATION', false);
    };
    if (!req.reference) fail('reference is required');
    if (!req.idempotencyKey) fail('idempotencyKey is required');
    if (!req.lines.length) fail('At least one line is required');
    for (const l of req.lines)
      if (!Number.isInteger(l.quantity) || l.quantity < 1) fail(`Invalid quantity for ${l.sku}`);
    if (!req.shipTo.postcode || !req.shipTo.line1 || !req.shipTo.name) fail('Incomplete delivery address');
    if (Object.values(orders).some((o) => o.reference === req.reference))
      fail(`Duplicate PO reference ${req.reference}`);
  }

  private toPlaceResult(order: MockOrder): PlaceOrderResult {
    return {
      distributorOrderId: order.distributorOrderId,
      status: order.lines.some((l) => l.backordered) ? 'backordered' : 'received',
      acceptedAt: order.createdAt,
      lines: order.lines.map((l) => ({
        sku: l.sku,
        accepted: l.quantity,
        confirmedCostExVat: l.confirmedCostExVat,
        ...(l.eta && { eta: l.eta }),
      })),
    };
  }

  private async simulateNetwork(): Promise<void> {
    const [min, max] = this.latency;
    if (max > 0) await new Promise((res) => setTimeout(res, min + this.random() * (max - min)));
    if (this.failRate > 0 && this.random() < this.failRate) {
      throw new DistributorError('Simulated network failure talking to TD SYNNEX', 'NETWORK', true);
    }
  }
}

const encodeCursor = (offset: number) => Buffer.from(`o:${offset}`).toString('base64url');
function decodeCursor(cursor: string): number {
  const m = /^o:(\d+)$/.exec(Buffer.from(cursor, 'base64url').toString());
  if (!m) throw new DistributorError('Invalid cursor', 'VALIDATION', false);
  return Number(m[1]);
}
