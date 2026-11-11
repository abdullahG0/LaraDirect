// Admin order queries (step 6.4). Admin-only: includes cost and profit.
import type { Db } from '@/lib/supabase/db';

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  email: string;
  customerName: string;
  organisation: string | null;
  total: number;
  profit: number | null;
  items: number;
  distributorOrderId: string | null;
  lastError: string | null;
  marginAlert: boolean;
  schoolPo: string | null;
  isSample: boolean;
}

export async function listAdminOrders(
  db: Db,
  opts: { customerId?: string; limit?: number } = {},
): Promise<AdminOrderRow[]> {
  let q = db
    .from('orders')
    .select(
      'id, order_number, created_at, status, email, ship_to, school_name, total_inc_vat, gross_profit, distributor_order_id, last_error, margin_alert, school_po_number, is_sample, order_items(quantity)',
    )
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 2000);
  if (opts.customerId) q = q.eq('customer_id', opts.customerId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((o) => {
    const ship = (o.ship_to ?? {}) as { name?: string; company?: string };
    return {
      id: o.id,
      orderNumber: o.order_number,
      createdAt: o.created_at ?? '',
      status: o.status,
      email: o.email,
      customerName: ship.name ?? '',
      organisation: o.school_name ?? ship.company ?? null,
      total: Number(o.total_inc_vat ?? 0),
      profit: o.gross_profit === null ? null : Number(o.gross_profit),
      items: (o.order_items as { quantity: number | null }[]).reduce((n, i) => n + (i.quantity ?? 0), 0),
      distributorOrderId: o.distributor_order_id,
      lastError: o.last_error,
      marginAlert: o.margin_alert,
      schoolPo: o.school_po_number,
      isSample: o.is_sample,
    };
  });
}

export async function getAdminOrder(db: Db, id: string) {
  const { data: order } = await db.from('orders').select('*').eq('id', id).maybeSingle();
  if (!order) return null;
  const [items, shipments, events, returns, customer] = await Promise.all([
    db.from('order_items').select('*').eq('order_id', id),
    db.from('shipments').select('*').eq('order_id', id).order('shipped_at'),
    db.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    db.from('returns').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    order.customer_id
      ? db.from('customers').select('*').eq('id', order.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    order,
    items: items.data ?? [],
    shipments: shipments.data ?? [],
    events: events.data ?? [],
    returns: returns.data ?? [],
    customer: customer.data,
  };
}
export type AdminOrderDetail = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;
