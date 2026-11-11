// Lazy, time-based order progression for the mock distributor (spec §4.3).
// Status is computed from the order's age, so it works on serverless with no timers.
import { createRng } from '@/lib/utils/rng';
import type { DistributorOrderStatus, OrderStatusResult, Shipment } from '../types';

export interface MockOrderLine {
  sku: string;
  quantity: number;
  confirmedCostExVat: number;
  backordered: boolean;
  serialised: boolean; // laptops/tablets get serial numbers
  eta?: string;
}

export interface MockOrder {
  distributorOrderId: string;
  reference: string;
  idempotencyKey: string;
  createdAt: string;
  cancelledAt?: string;
  lines: MockOrderLine[];
}

const MIN = 60_000;
const BACKORDER_DELAY_MIN = 24 * 60; // one (scaled) day

const CARRIERS = [
  { name: 'DPD', url: (n: string) => `https://track.dpd.co.uk/parcels/${n}`, num: (r: Rng) => digits(r, 14) },
  {
    name: 'Royal Mail',
    url: (n: string) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}`,
    num: (r: Rng) => `${letters(r, 2)}${digits(r, 9)}GB`,
  },
  {
    name: 'DHL',
    url: (n: string) => `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${n}`,
    num: (r: Rng) => digits(r, 10),
  },
  {
    name: 'UPS',
    url: (n: string) => `https://www.ups.com/track?tracknum=${n}`,
    num: (r: Rng) => `1Z${letters(r, 3)}${digits(r, 13)}`,
  },
] as const;

type Rng = ReturnType<typeof createRng>;
const digits = (r: Rng, n: number) => Array.from({ length: n }, () => r.int(0, 9)).join('');
const letters = (r: Rng, n: number) =>
  Array.from({ length: n }, () => 'ABCDEFGHJKLMNPRSTUVWXYZ'[r.int(0, 22)]).join('');

/** Per-order milestones in scaled minutes since creation; deterministic per order id. */
export function milestones(order: MockOrder) {
  const r = createRng(order.distributorOrderId);
  const backordered = order.lines.some((l) => l.backordered);
  const delay = backordered ? BACKORDER_DELAY_MIN : 0;
  const confirmAt = 1 + r.next(); // 1–2 min
  const shipAt = 10 + r.next() * 50 + delay; // 10–60 min (+ backorder delay)
  const deliverAt = Math.max(shipAt + 30, 60 + r.next() * 120 + delay); // 1–3 h
  // Multi-line orders sometimes ship in two parcels.
  const split = order.lines.length > 1 && r.chance(0.3);
  const secondShipAt = split ? shipAt + 20 + r.next() * 40 : shipAt;
  const secondDeliverAt = split ? Math.max(deliverAt, secondShipAt + 30) : deliverAt;
  return {
    backordered,
    confirmAt,
    backorderUntil: confirmAt + delay,
    shipAt,
    deliverAt,
    split,
    secondShipAt,
    secondDeliverAt,
  };
}

export function computeStatus(order: MockOrder, now: Date, timeScale: number): OrderStatusResult {
  const created = new Date(order.createdAt).getTime();
  const at = (scaledMin: number) => new Date(created + (scaledMin * MIN) / timeScale);
  const elapsed = ((now.getTime() - created) * timeScale) / MIN;
  const m = milestones(order);

  if (order.cancelledAt) {
    return {
      distributorOrderId: order.distributorOrderId,
      status: 'cancelled',
      updatedAt: order.cancelledAt,
      shipments: [],
    };
  }

  const r = createRng(`${order.distributorOrderId}:ship`);
  const parcels = m.split
    ? [
        {
          lines: order.lines.slice(0, Math.ceil(order.lines.length / 2)),
          shipAt: m.shipAt,
          deliverAt: m.deliverAt,
        },
        {
          lines: order.lines.slice(Math.ceil(order.lines.length / 2)),
          shipAt: m.secondShipAt,
          deliverAt: m.secondDeliverAt,
        },
      ]
    : [{ lines: order.lines, shipAt: m.shipAt, deliverAt: m.deliverAt }];

  const shipments: Shipment[] = [];
  for (const [i, p] of parcels.entries()) {
    const carrier = CARRIERS[r.int(0, CARRIERS.length - 1)]!;
    const trackingNumber = carrier.num(r);
    if (elapsed < p.shipAt) continue;
    shipments.push({
      carrier: carrier.name,
      trackingNumber,
      trackingUrl: carrier.url(trackingNumber),
      shippedAt: at(p.shipAt).toISOString(),
      deliveredAt: elapsed >= p.deliverAt ? at(p.deliverAt).toISOString() : undefined,
      lines: p.lines.map((l) => ({
        sku: l.sku,
        quantity: l.quantity,
        serialNumbers: l.serialised
          ? Array.from({ length: l.quantity }, (_, k) =>
              serial(`${order.distributorOrderId}:${i}:${l.sku}:${k}`),
            )
          : undefined,
      })),
    });
  }

  let status: DistributorOrderStatus;
  let updatedAt: Date;
  const allDelivered = shipments.length === parcels.length && shipments.every((s) => s.deliveredAt);
  if (allDelivered) {
    status = 'delivered';
    updatedAt = at(Math.max(...parcels.map((p) => p.deliverAt)));
  } else if (shipments.length === parcels.length) {
    status = 'shipped';
    updatedAt = at(Math.max(...parcels.map((p) => p.shipAt)));
  } else if (shipments.length > 0) {
    status = 'partially_shipped';
    updatedAt = at(m.shipAt);
  } else if (elapsed >= m.backorderUntil) {
    status = 'confirmed';
    updatedAt = at(m.backorderUntil);
  } else if (elapsed >= m.confirmAt) {
    status = m.backordered ? 'backordered' : 'confirmed';
    updatedAt = at(m.confirmAt);
  } else {
    status = 'received';
    updatedAt = new Date(created);
  }

  return {
    distributorOrderId: order.distributorOrderId,
    status,
    updatedAt: updatedAt.toISOString(),
    shipments,
  };
}

function serial(seed: string): string {
  const r = createRng(seed);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  return Array.from({ length: 10 }, () => chars[r.int(0, chars.length - 1)]).join('');
}
