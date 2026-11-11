import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/auth/admin';

// GET /api/admin/search?q= for the ⌘K palette (step 7.7).
export const GET = withAdmin('viewer', async (req, { db }) => {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ orders: [], products: [], customers: [] });
  // PostgREST `or` filters use commas and parentheses as syntax, so strip them from the term.
  const term = q.replace(/[,()%*]/g, ' ').trim();
  const like = `%${term}%`;

  const [orders, products, customers] = await Promise.all([
    db
      .from('orders')
      .select('id, order_number, email, status, total_inc_vat')
      .or(`order_number.ilike.${like},email.ilike.${like},school_po_number.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(6),
    db
      .from('products')
      .select('id, name, brand, distributor_sku')
      .or(`name.ilike.${like},brand.ilike.${like},distributor_sku.ilike.${like},mpn.ilike.${like}`)
      .limit(6),
    db
      .from('customers')
      .select('id, full_name, email, organisation')
      .or(`full_name.ilike.${like},email.ilike.${like},organisation.ilike.${like}`)
      .limit(6),
  ]);

  return NextResponse.json({
    orders: (orders.data ?? []).map((o) => ({
      id: o.id,
      label: o.order_number,
      sub: `${o.email} · ${o.status.replace(/_/g, ' ')}`,
    })),
    products: (products.data ?? []).map((p) => ({ id: p.id, label: p.name, sub: p.distributor_sku })),
    customers: (customers.data ?? []).map((c) => ({
      id: c.id,
      label: c.full_name ?? c.email,
      sub: [c.email, c.organisation].filter(Boolean).join(' · '),
    })),
  });
});
