import { ColumnChart } from '@/components/admin/charts';
import { PageHeader, Panel } from '@/components/admin/ui';
import { listAdminProducts } from '@/lib/admin/products';
import { marginBuckets } from '@/lib/admin/reports';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { ReportsView } from './reports-view';

export const metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  await requireAdminPage('viewer');
  const { rows } = await listAdminProducts(createServiceClient());
  const published = rows.filter((r) => r.isPublished);
  const buckets = marginBuckets(published.map((r) => r.marginPct));
  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales and gross profit by period, category, brand and product. Revenue is after discounts; profit is on goods ex VAT."
      />
      <ReportsView />
      <Panel
        title="Margin distribution"
        description={`Current margin across ${published.length} published products`}
        className="mt-4"
      >
        <ColumnChart data={buckets} valueLabel="Products" />
      </Panel>
    </>
  );
}
