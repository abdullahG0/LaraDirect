import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid, List, SearchX, X } from 'lucide-react';
import { withParams, RESERVED_PARAMS } from '@/lib/catalogue/filters';
import type { ListParams, ListResult } from '@/lib/catalogue/types';
import { formatGBP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { Breadcrumbs, type Crumb } from './breadcrumbs';
import { FilterPanel } from './filters/filter-panel';
import { MobileFilters } from './filters/mobile-filters';
import { SortSelect } from './filters/sort-select';
import { ProductGrid } from './product-grid';

type SearchParams = Record<string, string | string[] | undefined>;

interface Chip {
  label: string;
  href: string;
}

/** Removable chips for every active filter (spec §10.2). */
function activeChips(
  pathname: string,
  sp: SearchParams,
  params: ListParams,
  facetLabels: Record<string, string>,
): Chip[] {
  const chips: Chip[] = [];
  const without = (key: string, value?: string) => {
    const cur = sp[key];
    const values = (Array.isArray(cur) ? cur : cur ? [cur] : []).filter((v) => v !== value);
    return withParams(pathname, sp, { [key]: value && values.length ? values : null });
  };
  if (params.inStock) chips.push({ label: 'In stock', href: without('stock') });
  if (params.education) chips.push({ label: 'Education suitable', href: without('edu') });
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const lo = params.minPrice !== undefined ? formatGBP(params.minPrice) : 'Any';
    const hi = params.maxPrice !== undefined ? formatGBP(params.maxPrice) : 'any';
    chips.push({
      label: `${lo} to ${hi}`.replace(/\.00/g, ''),
      href: withParams(pathname, sp, { min: null, max: null }),
    });
  }
  for (const s of params.subs) chips.push({ label: s, href: without('type', s) });
  for (const b of params.brands) chips.push({ label: b, href: without('brand', b) });
  for (const [key, values] of Object.entries(params.facets)) {
    for (const v of values) chips.push({ label: `${facetLabels[key] ?? key}: ${v}`, href: without(key, v) });
  }
  return chips;
}

function pageList(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('…');
    out.push(p);
  });
  return out;
}

function Pagination({
  pathname,
  sp,
  page,
  pageCount,
}: {
  pathname: string;
  sp: SearchParams;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => withParams(pathname, sp, { page: p === 1 ? null : String(p) });
  const base =
    'grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <nav aria-label="Pagination" className="mt-10 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              className={cn(base, 'border bg-white text-brand-900 hover:border-brand-600')}
              rel="prev"
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span className="sr-only">Previous page</span>
            </Link>
          ) : (
            <span className={cn(base, 'border bg-white text-ink-400')} aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>
        {pageList(page, pageCount).map((p, i) => (
          <li key={`${p}-${i}`}>
            {p === '…' ? (
              <span className="px-2 text-ink-600">…</span>
            ) : p === page ? (
              <span aria-current="page" className={cn(base, 'bg-brand-900 text-white')}>
                {p}
              </span>
            ) : (
              <Link
                href={href(p)}
                className={cn(base, 'border bg-white text-brand-900 hover:border-brand-600')}
              >
                <span className="sr-only">Page </span>
                {p}
              </Link>
            )}
          </li>
        ))}
        <li>
          {page < pageCount ? (
            <Link
              href={href(page + 1)}
              className={cn(base, 'border bg-white text-brand-900 hover:border-brand-600')}
              rel="next"
            >
              <ChevronRight className="size-4" aria-hidden />
              <span className="sr-only">Next page</span>
            </Link>
          ) : (
            <span className={cn(base, 'border bg-white text-ink-400')} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

function ViewToggle({ pathname, sp, view }: { pathname: string; sp: SearchParams; view: 'grid' | 'list' }) {
  const item = (v: 'grid' | 'list', Icon: typeof List, label: string) => (
    <Link
      href={withParams(pathname, sp, { view: v === 'grid' ? null : v, page: (sp.page as string) ?? null })}
      aria-current={view === v ? 'true' : undefined}
      scroll={false}
      className={cn(
        'grid size-10 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        view === v ? 'bg-brand-900 text-white' : 'text-ink-600 hover:bg-accent',
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
      <span className="sr-only">{label}</span>
    </Link>
  );
  return (
    <div className="hidden items-center gap-1 rounded-lg border bg-white p-0.5 sm:flex">
      {item('grid', LayoutGrid, 'Grid view')}
      {item('list', List, 'List view')}
    </div>
  );
}

export function ListingView({
  title,
  intro,
  crumbs,
  pathname,
  searchParams,
  params,
  result,
  emptyHint,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  crumbs: Crumb[];
  pathname: string;
  searchParams: SearchParams;
  params: ListParams;
  result: ListResult;
  emptyHint?: React.ReactNode;
  children?: React.ReactNode; // optional block above the grid, e.g. subcategory tiles
}) {
  const view = searchParams.view === 'list' ? 'list' : 'grid';
  const facetLabels = Object.fromEntries(result.facets.map((f) => [f.key, f.label]));
  const chips = activeChips(pathname, searchParams, params, facetLabels);
  const clearAll = withParams(
    pathname,
    Object.fromEntries(
      Object.entries(searchParams).filter(([k]) => k === 'q' || k === 'sort' || k === 'view'),
    ),
    {},
  );
  const from = result.total === 0 ? 0 : (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.total, result.page * result.perPage);
  const hasUnknownFilters = Object.keys(searchParams).some(
    (k) => !RESERVED_PARAMS.has(k) && !(k in params.facets),
  );

  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6">
      <Breadcrumbs items={crumbs} />
      <div className="mt-4 flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold text-brand-900 sm:text-4xl">{title}</h1>
        {intro && <div className="max-w-3xl text-ink-600">{intro}</div>}
      </div>

      {children}

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters" className="hidden lg:block">
          <h2 className="mb-4 font-heading text-xl font-bold text-brand-900">Filters</h2>
          <FilterPanel facets={result.facets} priceBounds={result.priceBounds} />
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-600" aria-live="polite">
              {result.total === 0 ? (
                'No products found'
              ) : (
                <>
                  Showing{' '}
                  <strong className="text-ink-900">
                    {from}–{to}
                  </strong>{' '}
                  of <strong className="text-ink-900">{result.total}</strong>{' '}
                  {result.total === 1 ? 'product' : 'products'}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <MobileFilters
                facets={result.facets}
                priceBounds={result.priceBounds}
                activeCount={chips.length}
                total={result.total}
              />
              <SortSelect value={params.sort} />
              <ViewToggle pathname={pathname} sp={searchParams} view={view} />
            </div>
          </div>

          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    scroll={false}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-600/30 bg-brand-50 py-1 pl-3 pr-2 text-sm text-brand-900 hover:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {c.label}
                    <X className="size-3.5" aria-hidden />
                    <span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={clearAll}
                  scroll={false}
                  className="text-sm font-semibold text-brand-600 hover:underline"
                >
                  Clear all
                </Link>
              </li>
            </ul>
          )}

          <div className="mt-5">
            {result.total === 0 ? (
              <div className="rounded-2xl border border-dashed bg-white px-6 py-14 text-center">
                <SearchX className="mx-auto size-10 text-ink-400" aria-hidden />
                <h2 className="mt-3 font-heading text-xl font-semibold text-brand-900">No products match</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-600">
                  {emptyHint ?? 'Try removing a filter or two, or search for something more general.'}
                </p>
                {(chips.length > 0 || hasUnknownFilters) && (
                  <Link
                    href={clearAll}
                    className="mt-5 inline-flex h-10 items-center rounded-full bg-cta px-5 text-sm font-semibold text-cta-foreground hover:bg-cta-hover"
                  >
                    Clear all filters
                  </Link>
                )}
              </div>
            ) : (
              <ProductGrid products={result.items} layout={view} columns={3} priorityCount={3} />
            )}
          </div>

          <Pagination pathname={pathname} sp={searchParams} page={result.page} pageCount={result.pageCount} />
        </div>
      </div>
    </div>
  );
}
