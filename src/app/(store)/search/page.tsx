import type { Metadata } from 'next';
import Link from 'next/link';
import { ListingView } from '@/components/store/listing-view';
import { CATEGORIES } from '@/lib/catalogue/categories';
import { parseListParams } from '@/lib/catalogue/filters';
import { listProducts } from '@/lib/catalogue/queries';

type Props = { searchParams: Record<string, string | string[] | undefined> };

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = typeof searchParams.q === 'string' ? searchParams.q : '';
  return {
    title: q ? `Search results for “${q}”` : 'Search',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const params = parseListParams(searchParams);
  const result = await listProducts(params);
  const q = params.q ?? '';

  return (
    <ListingView
      title={q ? `Results for “${q}”` : 'Search'}
      crumbs={[{ label: 'Search' }]}
      pathname="/search"
      searchParams={searchParams}
      params={params}
      result={result}
      emptyHint={
        <>
          Check the spelling, try a more general word like “laptop” or “headset”, or browse a category:{' '}
          {CATEGORIES.slice(0, 4).map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ', '}
              <Link href={`/c/${c.slug}`} className="font-medium text-brand-600 underline underline-offset-2">
                {c.label}
              </Link>
            </span>
          ))}
          .
        </>
      }
    />
  );
}
