// Customer account data (step 8.2). Every query is scoped to the signed-in user's own customer
// record, and order data goes through a customer-safe shape (no cost, margin or distributor IDs).
import 'server-only';
import type { Db } from '@/lib/supabase/db';
import { customerStatusLabel, type OrderStatus } from '@/lib/orders/lifecycle';
import type { SessionUser } from '@/lib/auth/session';

/** Finds the customer record for a user, linking a guest record with the same email on first sign-in. */
export async function getOrLinkCustomer(db: Db, user: SessionUser) {
  const { data: own } = await db.from('customers').select('*').eq('user_id', user.id).maybeSingle();
  if (own) return own;
  if (!user.email) return null;
  // Supabase only issues a session after the email is confirmed, so linking by email is safe.
  const { data: guest } = await db
    .from('customers')
    .select('*')
    .ilike('email', user.email)
    .is('user_id', null)
    .limit(1)
    .maybeSingle();
  if (guest) {
    const { data } = await db
      .from('customers')
      .update({ user_id: user.id })
      .eq('id', guest.id)
      .select('*')
      .single();
    return data;
  }
  const { data } = await db
    .from('customers')
    .insert({ email: user.email.toLowerCase(), user_id: user.id })
    .select('*')
    .single();
  return data;
}

export async function getAccountOrders(db: Db, customerId: string) {
  const { data } = await db
    .from('orders')
    .select('order_number, created_at, status, total_inc_vat, access_token, order_items(name, quantity)')
    .eq('customer_id', customerId)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false });
  return (data ?? []).map((o) => ({
    orderNumber: o.order_number,
    createdAt: o.created_at ?? '',
    status: o.status as OrderStatus,
    statusLabel: customerStatusLabel(o.status as OrderStatus),
    total: Number(o.total_inc_vat ?? 0),
    href: `/order/${encodeURIComponent(o.order_number)}?token=${o.access_token}`,
    items: (o.order_items as { name: string | null; quantity: number | null }[]).map(
      (i) => `${i.quantity ?? 1} × ${i.name ?? ''}`,
    ),
  }));
}

/** Everything we hold about the customer, for the GDPR export. */
export async function exportAccountData(db: Db, customerId: string) {
  const [customer, addresses, orders] = await Promise.all([
    db
      .from('customers')
      .select('email, full_name, phone, organisation, created_at')
      .eq('id', customerId)
      .single(),
    db
      .from('addresses')
      .select('name, line1, line2, city, postcode, country, phone, is_default')
      .eq('customer_id', customerId),
    db
      .from('orders')
      .select(
        'order_number, created_at, status, email, ship_to, school_name, school_po_number, subtotal_inc_vat, discount_inc_vat, shipping_inc_vat, vat_total, total_inc_vat, delivery_method, notes, order_items(name, quantity, unit_price_inc_vat, serial_numbers)',
      )
      .eq('customer_id', customerId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    customer: customer.data,
    addresses: addresses.data ?? [],
    orders: orders.data ?? [],
  };
}

/**
 * Account deletion: removes contact details and saved addresses and the login. Order records are
 * kept (UK tax law requires six years) but stripped of email and phone.
 */
export async function deleteAccount(db: Db, customerId: string, userId: string) {
  const placeholder = `deleted-${customerId.slice(0, 8)}@deleted.invalid`;
  await db.from('addresses').delete().eq('customer_id', customerId);
  const { data: orders } = await db.from('orders').select('id, ship_to').eq('customer_id', customerId);
  for (const o of orders ?? []) {
    const ship = { ...((o.ship_to ?? {}) as Record<string, unknown>), phone: null };
    await db
      .from('orders')
      .update({ email: placeholder, ship_to: ship as never, bill_to: ship as never })
      .eq('id', o.id);
  }
  await db
    .from('customers')
    .update({
      email: placeholder,
      full_name: null,
      phone: null,
      organisation: null,
      notes: null,
      user_id: null,
    })
    .eq('id', customerId);
  await db.auth.admin.deleteUser(userId);
}
