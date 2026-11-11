import type { Db } from '@/lib/supabase/db';
import { SALE_STATUSES } from './metrics';

export interface AdminCustomerRow {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  phone: string | null;
  orders: number;
  lifetimeValue: number;
  lastOrderAt: string | null;
  createdAt: string | null;
  hasAccount: boolean;
}

export async function listAdminCustomers(db: Db): Promise<AdminCustomerRow[]> {
  const [{ data: customers }, { data: orders }] = await Promise.all([
    db
      .from('customers')
      .select('id, full_name, email, organisation, phone, created_at, user_id')
      .limit(10000),
    db
      .from('orders')
      .select('customer_id, status, total_inc_vat, created_at')
      .not('customer_id', 'is', null)
      .limit(20000),
  ]);
  const agg = new Map<string, { n: number; ltv: number; last: string | null }>();
  for (const o of orders ?? []) {
    if (!o.customer_id || !SALE_STATUSES.has(o.status)) continue;
    const a = agg.get(o.customer_id) ?? { n: 0, ltv: 0, last: null };
    a.n++;
    a.ltv += Number(o.total_inc_vat ?? 0);
    if (!a.last || (o.created_at ?? '') > a.last) a.last = o.created_at;
    agg.set(o.customer_id, a);
  }
  return (customers ?? []).map((c) => {
    const a = agg.get(c.id);
    return {
      id: c.id,
      name: c.full_name ?? c.email,
      email: c.email,
      organisation: c.organisation,
      phone: c.phone,
      orders: a?.n ?? 0,
      lifetimeValue: Math.round((a?.ltv ?? 0) * 100) / 100,
      lastOrderAt: a?.last ?? null,
      createdAt: c.created_at,
      hasAccount: !!c.user_id,
    };
  });
}
