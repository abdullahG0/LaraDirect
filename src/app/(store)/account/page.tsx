import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { getAccountOrders, getOrLinkCustomer } from '@/lib/account';
import { getCurrentUser } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/server';
import { AccountAuth, AccountDashboard } from './account-client';

export const metadata: Metadata = { title: 'My account', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-content px-4 pb-8 pt-6">
        <Breadcrumbs items={[{ label: 'My account' }]} />
        <h1 className="mt-4 font-heading text-3xl font-bold text-brand-900 sm:text-4xl">My account</h1>
        <AccountAuth />
      </div>
    );
  }

  const db = createServiceClient();
  const customer = await getOrLinkCustomer(db, user);
  const [orders, addresses] = customer
    ? await Promise.all([
        getAccountOrders(db, customer.id),
        db
          .from('addresses')
          .select('id, name, line1, line2, city, postcode, phone, is_default')
          .eq('customer_id', customer.id),
      ])
    : [[], { data: [] }];

  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6">
      <Breadcrumbs items={[{ label: 'My account' }]} />
      <h1 className="mt-4 font-heading text-3xl font-bold text-brand-900 sm:text-4xl">My account</h1>
      <AccountDashboard
        email={user.email}
        details={{
          fullName: customer?.full_name ?? '',
          phone: customer?.phone ?? '',
          organisation: customer?.organisation ?? '',
        }}
        orders={orders}
        addresses={(addresses.data ?? []).map((a) => ({
          id: a.id,
          name: a.name ?? '',
          line1: a.line1 ?? '',
          line2: a.line2,
          city: a.city ?? '',
          postcode: a.postcode ?? '',
          isDefault: !!a.is_default,
        }))}
      />
    </div>
  );
}
