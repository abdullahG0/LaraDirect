import { PageHeader } from '@/components/admin/ui';
import { listAdminProducts } from '@/lib/admin/products';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { ProductsTable } from './products-table';

export const metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: { filter?: string } }) {
  await requireAdminPage('viewer');
  const { rows } = await listAdminProducts(createServiceClient());
  const below = rows.filter((r) => r.marginStatus !== 'ok').length;
  return (
    <>
      <PageHeader
        title="Products"
        description={`${rows.length} products · ${rows.filter((r) => r.isPublished).length} published · ${below} below margin floor`}
      />
      <ProductsTable rows={rows} initialFilter={searchParams.filter ?? ''} />
    </>
  );
}
