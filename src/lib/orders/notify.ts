// Customer and admin notifications for order events (spec §8.1).
import type { Db } from '@/lib/supabase/db';
import { sendEmail } from '@/lib/email/send';
import { renderAdminAlert, renderOrderEmail, type OrderEmailPayload } from '@/lib/email/templates';
import { getSettings } from '@/lib/settings';
import { siteUrl } from '@/lib/site-url';
import { addOrderEvent } from './lifecycle';

export { siteUrl };

export type CustomerTemplate =
  'order_confirmation' | 'order_dispatched' | 'order_delivered' | 'order_problem';

export function trackingLink(orderNumber: string, token: string) {
  return `${siteUrl()}/order/${encodeURIComponent(orderNumber)}?token=${token}`;
}

export async function notifyCustomer(
  db: Db,
  orderId: string,
  template: CustomerTemplate,
  extra: Partial<OrderEmailPayload> = {},
): Promise<void> {
  const { data: order } = await db
    .from('orders')
    .select('id, order_number, email, ship_to, access_token, total_inc_vat, delivery_method, is_sample')
    .eq('id', orderId)
    .single();
  if (!order || order.is_sample) return;
  const { data: items } = await db
    .from('order_items')
    .select('name, quantity, unit_price_inc_vat')
    .eq('order_id', orderId);
  const settings = await getSettings(db);
  const shipTo = (order.ship_to ?? {}) as { name?: string };

  const email = renderOrderEmail(
    template,
    {
      orderNumber: order.order_number,
      customerName: shipTo.name ?? '',
      trackingUrl: trackingLink(order.order_number, order.access_token),
      lines: (items ?? []).map((i) => ({
        name: i.name ?? '',
        quantity: i.quantity ?? 1,
        unitPriceIncVat: Number(i.unit_price_inc_vat ?? 0),
      })),
      totalIncVat: Number(order.total_inc_vat ?? 0),
      deliveryMethod: order.delivery_method,
      ...extra,
    },
    settings.emailTemplates[template]?.subject ?? template,
  );
  await sendEmail(db, { to: order.email, template, email, orderId });
  await addOrderEvent(db, orderId, 'email.sent', `Email sent: ${email.subject}`, { template });
}

export async function notifyAdmins(db: Db, title: string, message: string, orderId?: string): Promise<void> {
  const settings = await getSettings(db);
  const to = process.env.ADMIN_ALERT_EMAIL ?? settings.company.email ?? 'admin@laradirect.example';
  const link = orderId ? `${siteUrl()}/admin/orders/${orderId}` : `${siteUrl()}/admin`;
  await sendEmail(db, {
    to,
    template: 'admin_alert',
    email: renderAdminAlert(title, message, link),
    orderId,
  });
}
