import Link from 'next/link';
import { notFound } from 'next/navigation';
import { KpiCard, Money, PageHeader, Panel, StatusBadge, fmtDate, fmtDateTime } from '@/components/admin/ui';
import { SALE_STATUSES } from '@/lib/admin/metrics';
import { listAdminOrders } from '@/lib/admin/orders';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { formatGBP } from '@/lib/utils/money';
import { CustomerNotes } from './customer-notes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: { params: { id: string } }) {
  await requireAdminPage('viewer');
  const db = createServiceClient();
  const { data: c } = await db.from('customers').select('*').eq('id', params.id).maybeSingle();
  if (!c) notFound();
  const [orders, addresses] = await Promise.all([
    listAdminOrders(db, { customerId: c.id }),
    db.from('addresses').select('*').eq('customer_id', c.id),
  ]);
  const sales = orders.filter((o) => SALE_STATUSES.has(o.status));
  const ltv = sales.reduce((s, o) => s + o.total, 0);
  const profit = sales.reduce((s, o) => s + (o.profit ?? 0), 0);

  return (
    <>
      <PageHeader
        back={{ href: '/admin/customers', label: 'Customers' }}
        title={c.full_name ?? c.email}
        description={[c.email, c.phone, c.organisation].filter(Boolean).join(' · ')}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Orders" value={sales.length} />
        <KpiCard label="Lifetime value" value={formatGBP(ltv)} />
        <KpiCard label="Gross profit" value={formatGBP(profit)} />
        <KpiCard
          label="Customer since"
          value={fmtDate(c.created_at)}
          sub={c.user_id ? 'Has an account' : 'Guest checkout'}
        />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Order history" className="xl:col-span-2" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Placed</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground">
                    No orders.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtDateTime(o.createdAt)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="tabular px-3 py-2 text-right">{o.items}</td>
                  <td className="px-4 py-2 text-right">
                    <Money value={o.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="space-y-4">
          <CustomerNotes id={c.id} initial={c.notes ?? ''} />
          <Panel title="Saved addresses">
            {(addresses.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">None saved.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(addresses.data ?? []).map((a) => (
                  <li key={a.id} className="rounded-md border p-2">
                    {[a.name, a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(', ')}
                    {a.is_default && <span className="ml-1 text-xs text-muted-foreground">(default)</span>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
