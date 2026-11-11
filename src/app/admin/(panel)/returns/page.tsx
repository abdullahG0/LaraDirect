import { PageHeader } from '@/components/admin/ui';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { ReturnsBoard } from './returns-board';

export const metadata = { title: 'Returns' };
export const dynamic = 'force-dynamic';

export default async function ReturnsPage({ searchParams }: { searchParams: { order?: string } }) {
  await requireAdminPage('viewer');
  const { data } = await createServiceClient()
    .from('returns')
    .select('*, orders(id, order_number, email, ship_to)')
    .order('created_at', { ascending: false })
    .limit(500);
  const rows = (data ?? []).map((r) => {
    const o = r.orders as {
      id: string;
      order_number: string;
      email: string;
      ship_to: { name?: string };
    } | null;
    return {
      id: r.id,
      status: r.status,
      reason: r.reason,
      notes: r.notes,
      rma: r.tds_rma_reference,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      orderId: o?.id ?? null,
      orderNumber: o?.order_number ?? '—',
      customer: o?.ship_to?.name ?? o?.email ?? '—',
    };
  });
  return (
    <>
      <PageHeader
        title="Returns"
        description="Manual workflow: requested → authorised → received → refunded. TD SYNNEX’s returns API isn’t available yet, so record their RMA reference here."
      />
      <ReturnsBoard rows={rows} prefillOrder={searchParams.order ?? ''} />
    </>
  );
}
