import { PageHeader } from '@/components/admin/ui';
import { listAdminOrders } from '@/lib/admin/orders';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { OrdersTable } from './orders-table';

export const metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireAdminPage('viewer');
  const orders = await listAdminOrders(createServiceClient());
  return (
    <>
      <PageHeader title="Orders" description={`${orders.length} orders`} />
      <OrdersTable orders={orders} initialStatus={searchParams.status ?? ''} />
    </>
  );
}
