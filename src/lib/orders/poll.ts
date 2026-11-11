// Status poller (spec §8.1 step 4, build step 5.3): asks the distributor about every open order,
// walks the order through the state machine, records shipments and serial numbers, and emails
// the customer on dispatch and delivery.
import {
  DistributorError,
  type Distributor,
  type DistributorOrderStatus,
  type OrderStatusResult,
} from '@/lib/distributor';
import type { Db } from '@/lib/supabase/db';
import { distributorFor } from '@/lib/services/distributor';
import { OPEN_STATUSES, addOrderEvent, pathTo, transitionOrder, type OrderStatus } from './lifecycle';
import { notifyAdmins, notifyCustomer } from './notify';

/** Distributor status → LaraDirect order status. `received` means nothing new yet. */
export function mapDistributorStatus(s: DistributorOrderStatus): OrderStatus | null {
  switch (s) {
    case 'received':
      return null;
    case 'confirmed':
      return 'confirmed';
    case 'backordered':
      return 'backordered';
    case 'partially_shipped':
      return 'partially_shipped';
    case 'shipped':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    case 'rejected':
      return 'failed';
  }
}

export interface PollOutcome {
  orderNumber: string;
  from: OrderStatus;
  to: OrderStatus;
  newShipments: number;
  error?: string;
}

interface PollableOrder {
  id: string;
  order_number: string;
  status: string;
  distributor_order_id: string | null;
}

export async function pollOrder(db: Db, order: PollableOrder, d: Distributor): Promise<PollOutcome> {
  const from = order.status as OrderStatus;
  const out: PollOutcome = { orderNumber: order.order_number, from, to: from, newShipments: 0 };
  if (!order.distributor_order_id) return out;

  let status: OrderStatusResult;
  try {
    status = await d.getOrderStatus(order.distributor_order_id);
  } catch (err) {
    out.error = err instanceof DistributorError ? `${err.code}: ${err.message}` : (err as Error).message;
    return out;
  }

  await db.from('orders').update({ distributor_status: status.status }).eq('id', order.id);
  out.newShipments = await recordShipments(db, order.id, status);

  const target = mapDistributorStatus(status.status);
  if (!target || target === from) return out;
  const path = pathTo(from, target);
  if (!path) {
    await addOrderEvent(
      db,
      order.id,
      'poll.mismatch',
      `TD SYNNEX reports "${status.status}" but the order is ${from}`,
      { distributorStatus: status.status },
    );
    return out;
  }

  for (const step of path) {
    await transitionOrder(db, order.id, step, {
      message: stepMessage(step, status),
      data: { distributorStatus: status.status },
      patch: step === 'failed' ? { last_error: status.rejectionReason ?? 'Rejected by distributor' } : {},
    });
    out.to = step;
  }

  // Customer emails for the states they care about (spec §8.1 step 4).
  const shipment = status.shipments[0];
  if (path.includes('shipped') || path.includes('partially_shipped')) {
    if (!(path.includes('shipped') && from === 'partially_shipped')) {
      await notifyCustomer(db, order.id, 'order_dispatched', {
        carrier: shipment?.carrier,
        trackingNumber: shipment?.trackingNumber,
        carrierTrackingUrl: shipment?.trackingUrl,
      });
    }
  }
  if (path.includes('delivered')) await notifyCustomer(db, order.id, 'order_delivered');
  if (path.includes('failed')) {
    await notifyAdmins(
      db,
      `Order ${order.order_number} rejected`,
      status.rejectionReason ?? 'Rejected by TD SYNNEX',
      order.id,
    );
    await notifyCustomer(db, order.id, 'order_problem');
  }
  return out;
}

function stepMessage(step: OrderStatus, s: OrderStatusResult): string {
  switch (step) {
    case 'confirmed':
      return 'Confirmed by TD SYNNEX';
    case 'backordered':
      return 'Awaiting stock at TD SYNNEX';
    case 'partially_shipped':
      return 'Part of the order has been dispatched';
    case 'shipped':
      return s.shipments.length
        ? `Dispatched with ${[...new Set(s.shipments.map((x) => x.carrier))].join(' and ')}`
        : 'Dispatched';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled by TD SYNNEX';
    case 'failed':
      return `Rejected by TD SYNNEX: ${s.rejectionReason ?? 'no reason given'}`;
    default:
      return `Status ${step}`;
  }
}

/** Inserts new shipments (by tracking number), updates delivery times, and stores serial numbers. */
async function recordShipments(db: Db, orderId: string, status: OrderStatusResult): Promise<number> {
  if (!status.shipments.length) return 0;
  const { data: existing } = await db
    .from('shipments')
    .select('id, tracking_number, delivered_at')
    .eq('order_id', orderId);
  const byTracking = new Map((existing ?? []).map((s) => [s.tracking_number, s]));
  let added = 0;

  for (const s of status.shipments) {
    const prev = byTracking.get(s.trackingNumber);
    if (!prev) {
      await db.from('shipments').insert({
        order_id: orderId,
        carrier: s.carrier,
        tracking_number: s.trackingNumber,
        tracking_url: s.trackingUrl ?? null,
        shipped_at: s.shippedAt,
        delivered_at: s.deliveredAt ?? null,
      });
      added++;
    } else if (s.deliveredAt && !prev.delivered_at) {
      await db.from('shipments').update({ delivered_at: s.deliveredAt }).eq('id', prev.id);
    }
  }

  // Serial numbers per SKU (laptops/tablets), merged without duplicates.
  const serials = new Map<string, string[]>();
  for (const s of status.shipments)
    for (const l of s.lines)
      if (l.serialNumbers?.length) serials.set(l.sku, [...(serials.get(l.sku) ?? []), ...l.serialNumbers]);
  if (serials.size) {
    const { data: items } = await db
      .from('order_items')
      .select('id, distributor_sku, serial_numbers')
      .eq('order_id', orderId);
    for (const i of items ?? []) {
      const add = serials.get(i.distributor_sku ?? '');
      if (!add) continue;
      const merged = [...new Set([...(i.serial_numbers ?? []), ...add])];
      if (merged.length !== (i.serial_numbers ?? []).length) {
        await db.from('order_items').update({ serial_numbers: merged }).eq('id', i.id);
      }
    }
  }
  return added;
}

/** Cron: poll every open order (POST /api/cron/poll-orders). Sample seed orders are skipped. */
export async function pollOpenOrders(
  db: Db,
  limit = 100,
): Promise<{ polled: number; changed: PollOutcome[]; errors: number }> {
  const { data } = await db
    .from('orders')
    .select('id, order_number, status, distributor_order_id')
    .in('status', OPEN_STATUSES)
    .eq('is_sample', false)
    .not('distributor_order_id', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(limit);
  const orders = data ?? [];
  if (!orders.length) return { polled: 0, changed: [], errors: 0 };
  const d = await distributorFor(db);
  const changed: PollOutcome[] = [];
  let errors = 0;
  for (const o of orders) {
    try {
      const r = await pollOrder(db, o, d);
      if (r.error) errors++;
      if (r.to !== r.from || r.newShipments) changed.push(r);
    } catch (err) {
      errors++;
      console.error(`poll ${o.order_number}: ${(err as Error).message}`);
    }
  }
  return { polled: orders.length, changed, errors };
}
