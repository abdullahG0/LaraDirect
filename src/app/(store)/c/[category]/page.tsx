import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListingView } from '@/components/store/listing-view';
import { CATEGORIES, categoryBySlug } from '@/lib/catalogue/categories';
import { parseListParams } from '@/lib/catalogue/filters';
import { listProducts } from '@/lib/catalogue/queries';

type Props = {
  params: { category: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const cat = categoryBySlug(params.category);
  if (!cat) return {};
  return {
    title: cat.label,
    description: cat.blurb,
    alternates: { canonical: `/c/${cat.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const cat = categoryBySlug(params.category);
  if (!cat) notFound();
  const listParams = parseListParams(searchParams, { category: cat.name });
  const result = await listProducts(listParams);

  return (
    <ListingView
      title={cat.label}
      intro={cat.blurb}
      crumbs={[{ label: cat.label }]}
      pathname={`/c/${cat.slug}`}
      searchParams={searchParams}
      params={listParams}
      result={result}
    >
      <nav aria-label={`${cat.label} types`} className="mt-5">
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {cat.subcategories.map((s) => (
            <li key={s.slug} className="shrink-0">
              <Link
                href={`/c/${cat.slug}/${s.slug}`}
                className="inline-flex h-9 items-center rounded-full border bg-white px-4 text-sm font-medium text-brand-900 hover:border-brand-600 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </ListingView>
  );
}
