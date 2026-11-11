import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { BasketView } from './basket-view';

export const metadata: Metadata = { title: 'Your basket', robots: { index: false } };

export default function BasketPage() {
  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6">
      <Breadcrumbs items={[{ label: 'Basket' }]} />
      <h1 className="mt-4 font-heading text-3xl font-bold text-brand-900 sm:text-4xl">Your basket</h1>
      <BasketView />
    </div>
  );
}
