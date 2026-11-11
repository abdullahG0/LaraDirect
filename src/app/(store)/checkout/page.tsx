import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { getCurrentUser } from '@/lib/auth/session';
import { stripeConfigured } from '@/lib/payments/stripe';
import { CheckoutForm } from './checkout-form';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ searchParams }: { searchParams: { cancelled?: string } }) {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6">
      <Breadcrumbs items={[{ label: 'Basket', href: '/basket' }, { label: 'Checkout' }]} />
      <h1 className="mt-4 font-heading text-3xl font-bold text-brand-900 sm:text-4xl">Checkout</h1>
      {searchParams.cancelled && (
        <p
          className="mt-4 rounded-xl border border-warn-500/40 bg-warn-500/10 p-3 text-sm text-ink-900"
          role="status"
        >
          Payment was cancelled, so you haven’t been charged. Your basket is still here when you’re ready.
        </p>
      )}
      <CheckoutForm
        stripeEnabled={stripeConfigured()}
        demoMode={process.env.NEXT_PUBLIC_DEMO_MODE === 'true'}
        defaultEmail={user?.email ?? ''}
      />
    </div>
  );
}
