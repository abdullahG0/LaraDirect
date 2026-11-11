import type { Metadata } from 'next';
import { ListingView } from '@/components/store/listing-view';
import { parseListParams } from '@/lib/catalogue/filters';
import { listProducts } from '@/lib/catalogue/queries';

export const metadata: Metadata = {
  title: 'Deals',
  description: 'Teacher tech priced below the manufacturer’s recommended retail price.',
  alternates: { canonical: '/deals' },
};

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function DealsPage({ searchParams }: Props) {
  const params = parseListParams(searchParams, { deals: true });
  const result = await listProducts(params);
  return (
    <ListingView
      title="Deals"
      intro="Products currently priced at least 5% below the manufacturer’s recommended retail price (RRP)."
      crumbs={[{ label: 'Deals' }]}
      pathname="/deals"
      searchParams={searchParams}
      params={params}
      result={result}
    />
  );
}
