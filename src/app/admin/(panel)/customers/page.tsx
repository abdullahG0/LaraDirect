import { PageHeader } from '@/components/admin/ui';
import { listAdminCustomers } from '@/lib/admin/customers';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { CustomersTable } from './customers-table';

export const metadata = { title: 'Customers' };
export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  await requireAdminPage('viewer');
  const rows = await listAdminCustomers(createServiceClient());
  return (
    <>
      <PageHeader title="Customers" description={`${rows.length} customers`} />
      <CustomersTable rows={rows} />
    </>
  );
}
