'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { formatGBP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import type { ProductSummary } from '@/lib/catalogue/types';

interface Suggestions {
  products: ProductSummary[];
  categories: { label: string; href: string }[];
}

const EMPTY: Suggestions = { products: [], categories: [] };

/** Header search with debounced suggestions (step 3.7). Combobox pattern for screen readers. */
export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [results, setResults] = useState<Suggestions>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounced fetch; aborts stale requests so results never arrive out of order.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          setResults((await res.json()) as Suggestions);
          setActive(-1);
        }
      } catch {
        // aborted or offline: keep previous results
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (active >= 0 && results.products[active]) {
      router.push(`/p/${results.products[active].slug}`);
    } else if (term) {
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = results.products.length;
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % n);
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? n - 1 : i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const showPanel = open && q.trim().length >= 2;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <input
            id={`${listId}-input`}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search laptops, iPads, headsets, accessories…"
            autoComplete="off"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            className="h-11 w-full rounded-lg border border-input bg-white pl-11 pr-24 text-[15px] text-ink-900 shadow-sm placeholder:text-ink-400 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-md bg-brand-900 px-3 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1"
          >
            Search
          </button>
        </div>
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-white shadow-card-hover">
          {loading && results.products.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-3 text-sm text-ink-600">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Searching…
            </p>
          ) : results.products.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-600">No products match “{q.trim()}”.</p>
          ) : (
            <>
              <ul id={listId} role="listbox" aria-label="Product suggestions" className="py-1">
                {results.products.map((p, i) => (
                  <li key={p.id} id={optionId(i)} role="option" aria-selected={active === i}>
                    <Link
                      href={`/p/${p.slug}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2 hover:bg-accent',
                        active === i && 'bg-accent',
                      )}
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-surface-alt">
                        {p.images[0] && (
                          <Image src={p.images[0]} alt="" fill sizes="44px" className="object-contain" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">{p.name}</span>
                        <span className="block truncate text-xs text-ink-600">{p.keySpecs}</span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-brand-900">
                        {formatGBP(p.priceIncVat)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 border-t bg-surface-alt px-4 py-2.5 text-sm">
                {results.categories.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className="rounded-full border bg-white px-3 py-1 text-ink-600 hover:border-brand-600 hover:text-brand-600"
                  >
                    in {c.label}
                  </Link>
                ))}
                <Link
                  href={`/search?q=${encodeURIComponent(q.trim())}`}
                  onClick={() => setOpen(false)}
                  className="ml-auto font-semibold text-brand-600 hover:underline"
                >
                  See all results
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
