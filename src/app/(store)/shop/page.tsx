import type { Metadata } from 'next';
import { ListingView } from '@/components/store/listing-view';
import { parseListParams } from '@/lib/catalogue/filters';
import { listProducts } from '@/lib/catalogue/queries';

export const metadata: Metadata = {
  title: 'Shop all products',
  description: 'Laptops, tablets, monitors, headsets and classroom accessories, with prices including VAT.',
  alternates: { canonical: '/shop' },
};

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function ShopPage({ searchParams }: Props) {
  const params = parseListParams(searchParams);
  const result = await listProducts(params);
  return (
    <ListingView
      title="All products"
      intro="Everything we stock for classrooms, staff rooms and school offices."
      crumbs={[{ label: 'All products' }]}
      pathname="/shop"
      searchParams={searchParams}
      params={params}
      result={result}
    />
  );
}
