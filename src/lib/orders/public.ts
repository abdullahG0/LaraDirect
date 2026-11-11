// Customer-facing order DTO (step 5.5). Never includes cost, margin, distributor IDs or SKUs.
import { timingSafeEqual } from 'node:crypto';
import type { Db } from '@/lib/supabase/db';
import { customerStatusLabel, timelineIndex, type OrderStatus } from './lifecycle';

export interface PublicOrder {
  orderNumber: string;
  status: OrderStatus;
  statusLabel: string;
  timelineIndex: number;
  createdAt: string;
  paidAt: string | null;
  email: string;
  shipTo: {
    name: string;
    company?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    postcode: string;
  };
  deliveryMethod: string;
  schoolPoNumber: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  vat: number;
  total: number;
  items: {
    name: string;
    quantity: number;
    unitPriceIncVat: number;
    slug: string | null;
    image: string | null;
    serialNumbers: string[];
  }[];
  shipments: {
    carrier: string;
    trackingNumber: string;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  }[];
  events: { at: string; label: string }[];
  emails: { subject: string; template: string; sentAt: string; text: string }[];
}

export function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Order events shown to customers, with friendly wording.
const CUSTOMER_EVENTS: Record<string, string> = {
  'order.created': 'Order placed',
  'payment.succeeded': 'Payment received',
  'status.submitted': 'Order sent to our warehouse',
  'status.confirmed': 'Order confirmed and being prepared',
  'status.backordered': 'Waiting for stock, we’ll update you',
  'status.partially_shipped': 'Part of your order has been dispatched',
  'status.shipped': 'Dispatched',
  'status.delivered': 'Delivered',
  'status.cancelled': 'Order cancelled',
  'status.refunded': 'Refund issued',
  'submit.failed': 'We hit a problem and our team is on it',
};

export async function getPublicOrder(
  db: Db,
  orderNumber: string,
  token: string,
): Promise<{ id: string; order: PublicOrder } | null> {
  if (!token || token.length > 64) return null;
  const { data: o } = await db
    .from('orders')
    .select(
      'id, order_number, status, created_at, paid_at, email, ship_to, delivery_method, school_po_number, subtotal_inc_vat, discount_inc_vat, shipping_inc_vat, vat_total, total_inc_vat, access_token',
    )
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (!o || !tokensMatch(o.access_token, token)) return null;

  const [items, shipments, events, emails] = await Promise.all([
    db
      .from('order_items')
      .select('name, quantity, unit_price_inc_vat, serial_numbers, product_id')
      .eq('order_id', o.id),
    db
      .from('shipments')
      .select('carrier, tracking_number, tracking_url, shipped_at, delivered_at')
      .eq('order_id', o.id)
      .order('shipped_at'),
    db.from('order_events').select('type, created_at').eq('order_id', o.id).order('created_at'),
    db
      .from('outbox')
      .select('subject, template, created_at, payload')
      .eq('payload->>orderId', o.id)
      .neq('template', 'admin_alert')
      .order('created_at'),
  ]);

  const productIds = (items.data ?? []).map((i) => i.product_id).filter(Boolean) as string[];
  const { data: products } = productIds.length
    ? await db.from('public_products').select('id, slug, images').in('id', productIds)
    : { data: [] as { id: string | null; slug: string | null; images: string[] | null }[] };
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const status = o.status as OrderStatus;
  const ship = (o.ship_to ?? {}) as PublicOrder['shipTo'];

  return {
    id: o.id,
    order: {
      orderNumber: o.order_number,
      status,
      statusLabel: customerStatusLabel(status),
      timelineIndex: timelineIndex(status),
      createdAt: o.created_at ?? '',
      paidAt: o.paid_at,
      email: o.email,
      shipTo: {
        name: ship.name,
        company: ship.company,
        line1: ship.line1,
        line2: ship.line2,
        city: ship.city,
        postcode: ship.postcode,
      },
      deliveryMethod: o.delivery_method,
      schoolPoNumber: o.school_po_number,
      subtotal: Number(o.subtotal_inc_vat ?? 0),
      discount: Number(o.discount_inc_vat ?? 0),
      shipping: Number(o.shipping_inc_vat ?? 0),
      vat: Number(o.vat_total ?? 0),
      total: Number(o.total_inc_vat ?? 0),
      items: (items.data ?? []).map((i) => {
        const p = i.product_id ? productById.get(i.product_id) : undefined;
        return {
          name: i.name ?? '',
          quantity: i.quantity ?? 1,
          unitPriceIncVat: Number(i.unit_price_inc_vat ?? 0),
          slug: p?.slug ?? null,
          image: p?.images?.[0] ?? null,
          // Serial numbers are shown once delivered (spec §10.5).
          serialNumbers: status === 'delivered' ? (i.serial_numbers ?? []) : [],
        };
      }),
      shipments: (shipments.data ?? []).map((s) => ({
        carrier: s.carrier ?? '',
        trackingNumber: s.tracking_number ?? '',
        trackingUrl: s.tracking_url,
        shippedAt: s.shipped_at,
        deliveredAt: s.delivered_at,
      })),
      events: (events.data ?? [])
        .filter((e) => e.type && CUSTOMER_EVENTS[e.type])
        .map((e) => ({ at: e.created_at ?? '', label: CUSTOMER_EVENTS[e.type!]! })),
      emails: (emails.data ?? []).map((e) => ({
        subject: e.subject ?? '',
        template: e.template ?? '',
        sentAt: e.created_at ?? '',
        text: String((e.payload as { text?: string } | null)?.text ?? ''),
      })),
    },
  };
}
