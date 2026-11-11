// Order state machine (spec §8): allowed transitions, customer labels, and transitionOrder().
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'submitting'
  | 'submitted'
  | 'confirmed'
  | 'backordered'
  | 'partially_shipped'
  | 'shipped'
  | 'delivered'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['submitting', 'cancelled'],
  submitting: ['submitted', 'failed'],
  submitted: ['confirmed', 'backordered', 'cancelled', 'failed'],
  confirmed: ['partially_shipped', 'shipped', 'cancelled'],
  backordered: ['confirmed', 'cancelled'],
  partially_shipped: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  failed: ['submitting', 'cancelled'],
  cancelled: ['refunded'],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Friendlier customer-facing label (spec §8.2). */
export function customerStatusLabel(s: OrderStatus): string {
  switch (s) {
    case 'pending_payment':
    case 'paid':
    case 'submitting':
    case 'submitted':
      return 'Order received';
    case 'confirmed':
      return 'Preparing your order';
    case 'backordered':
      return 'Delayed (awaiting stock)';
    case 'partially_shipped':
    case 'shipped':
      return 'Dispatched';
    case 'delivered':
      return 'Delivered';
    case 'failed':
      return 'Problem with your order — we’re on it';
    case 'cancelled':
      return 'Cancelled';
    case 'refunded':
      return 'Refunded';
  }
}

export const OPEN_STATUSES: OrderStatus[] = [
  'submitted',
  'confirmed',
  'backordered',
  'partially_shipped',
  'shipped',
];
export const PRE_SHIPPED: OrderStatus[] = [
  'pending_payment',
  'paid',
  'submitting',
  'submitted',
  'confirmed',
  'backordered',
  'failed',
];
export const ALL_STATUSES = Object.keys(TRANSITIONS) as OrderStatus[];

/** Shortest chain of allowed transitions from one status to another (excluding `from`), or null. */
export function pathTo(from: OrderStatus, to: OrderStatus): OrderStatus[] | null {
  if (from === to) return [];
  const prev = new Map<OrderStatus, OrderStatus>();
  const queue: OrderStatus[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of TRANSITIONS[cur]) {
      if (next === from || prev.has(next)) continue;
      prev.set(next, cur);
      if (next === to) {
        const path: OrderStatus[] = [to];
        let p = cur;
        while (p !== from) {
          path.unshift(p);
          p = prev.get(p)!;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/** Customer timeline steps (spec §10.5): Received → Preparing → Dispatched → Delivered. */
export const TIMELINE_STEPS = ['Order received', 'Preparing your order', 'Dispatched', 'Delivered'] as const;

export function timelineIndex(s: OrderStatus): number {
  switch (s) {
    case 'pending_payment':
    case 'paid':
    case 'submitting':
    case 'submitted':
    case 'failed':
      return 0;
    case 'confirmed':
    case 'backordered':
      return 1;
    case 'partially_shipped':
    case 'shipped':
      return 2;
    case 'delivered':
      return 3;
    case 'cancelled':
    case 'refunded':
      return -1;
  }
}

export class InvalidTransitionError extends Error {
  constructor(
    public from: OrderStatus,
    public to: OrderStatus,
  ) {
    super(`Order can't move from ${from.replace('_', ' ')} to ${to.replace('_', ' ')}`);
    this.name = 'InvalidTransitionError';
  }
}

/** Minimal DB surface used by transitionOrder, so it stays easy to test. */
interface TransitionDb {
  from(table: 'orders' | 'order_events'): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [k: string]: any;
  };
}

export interface TransitionEvent {
  type?: string;
  message?: string;
  data?: unknown;
  actor?: string;
  patch?: Record<string, unknown>; // extra order columns to set in the same update
}

/**
 * Moves an order to `to` (step 5.1b): enforces canTransition, writes an order_events row and
 * bumps updated_at. The update is conditional on the current status, so two workers racing on
 * the same order can't both apply the transition.
 */
export async function transitionOrder(
  db: TransitionDb,
  orderId: string,
  to: OrderStatus,
  event: TransitionEvent = {},
): Promise<{ from: OrderStatus; to: OrderStatus }> {
  const { data: order, error } = await db.from('orders').select('status').eq('id', orderId).single();
  if (error || !order) throw new Error(`Order ${orderId} not found`);
  const from = order.status as OrderStatus;
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);

  const { data: updated, error: upErr } = await db
    .from('orders')
    .update({ ...event.patch, status: to, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', from)
    .select('id');
  if (upErr) throw new Error(`Order update failed: ${upErr.message}`);
  if (!updated?.length) throw new InvalidTransitionError(from, to); // someone else moved it first

  await db.from('order_events').insert({
    order_id: orderId,
    type: event.type ?? `status.${to}`,
    message: event.message ?? `Status changed from ${from.replace('_', ' ')} to ${to.replace('_', ' ')}`,
    data: { from, to, ...(event.data && typeof event.data === 'object' ? event.data : {}) },
    actor: event.actor ?? 'system',
  });
  return { from, to };
}

/** Records an order event without changing status. */
export async function addOrderEvent(
  db: TransitionDb,
  orderId: string,
  type: string,
  message: string,
  data: unknown = {},
  actor = 'system',
) {
  await db.from('order_events').insert({ order_id: orderId, type, message, data, actor });
}
