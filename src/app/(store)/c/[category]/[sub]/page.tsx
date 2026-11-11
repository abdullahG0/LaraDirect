import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingView } from '@/components/store/listing-view';
import { CATEGORIES, categoryBySlug, subcategoryBySlug } from '@/lib/catalogue/categories';
import { parseListParams } from '@/lib/catalogue/filters';
import { listProducts } from '@/lib/catalogue/queries';

type Props = {
  params: { category: string; sub: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export function generateStaticParams() {
  return CATEGORIES.flatMap((c) => c.subcategories.map((s) => ({ category: c.slug, sub: s.slug })));
}

function resolve(params: Props['params']) {
  const cat = categoryBySlug(params.category);
  const sub = cat ? subcategoryBySlug(cat, params.sub) : undefined;
  return cat && sub ? { cat, sub } : null;
}

export function generateMetadata({ params }: Props): Metadata {
  const r = resolve(params);
  if (!r) return {};
  return {
    title: `${r.sub.name} | ${r.cat.label}`,
    description: `Shop ${r.sub.name.toLowerCase()} for teachers and schools. ${r.cat.blurb}`,
    alternates: { canonical: `/c/${r.cat.slug}/${r.sub.slug}` },
  };
}

export default async function SubcategoryPage({ params, searchParams }: Props) {
  const r = resolve(params);
  if (!r) notFound();
  const listParams = parseListParams(searchParams, { category: r.cat.name, subcategory: r.sub.name });
  const result = await listProducts(listParams);

  return (
    <ListingView
      title={r.sub.name}
      crumbs={[{ label: r.cat.label, href: `/c/${r.cat.slug}` }, { label: r.sub.name }]}
      pathname={`/c/${r.cat.slug}/${r.sub.slug}`}
      searchParams={searchParams}
      params={listParams}
      result={result}
    />
  );
}
