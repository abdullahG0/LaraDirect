// On-view refresh for one order (demo nicety): the tracking page and admin "Refresh status" poll
// the distributor for this order, so progress shows without waiting for the cron.
import type { Db } from '@/lib/supabase/db';
import { distributorFor } from '@/lib/services/distributor';
import { OPEN_STATUSES, type OrderStatus } from './lifecycle';
import { pollOrder } from './poll';
import { submitOrder } from './submit';

const lastRefresh = new Map<string, number>();
const MIN_INTERVAL_MS = 15_000;

export async function refreshOrder(db: Db, orderId: string): Promise<boolean> {
  const { data: o } = await db
    .from('orders')
    .select('id, order_number, status, distributor_order_id, next_attempt_at, is_sample')
    .eq('id', orderId)
    .single();
  if (!o || o.is_sample) return false;
  const status = o.status as OrderStatus;

  if (
    status === 'paid' ||
    (status === 'submitting' && (!o.next_attempt_at || new Date(o.next_attempt_at) <= new Date()))
  ) {
    const r = await submitOrder(db, orderId);
    return r.outcome !== 'skipped';
  }
  if (OPEN_STATUSES.includes(status) && o.distributor_order_id) {
    const r = await pollOrder(db, o, await distributorFor(db));
    return r.to !== r.from || r.newShipments > 0;
  }
  return false;
}

/** Same as refreshOrder, but at most once every 15 s per order (per server instance). */
export async function refreshOrderIfStale(db: Db, orderId: string): Promise<boolean> {
  const now = Date.now();
  if (now - (lastRefresh.get(orderId) ?? 0) < MIN_INTERVAL_MS) return false;
  lastRefresh.set(orderId, now);
  try {
    return await refreshOrder(db, orderId);
  } catch (err) {
    console.warn(`refresh ${orderId}: ${(err as Error).message}`);
    return false;
  }
}
