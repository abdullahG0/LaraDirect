import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { CATEGORIES } from '@/lib/catalogue/categories';

/**
 * Desktop category menu. Panels open on hover and on keyboard focus (focus-within),
 * so it works without JavaScript and every link is reachable with Tab.
 */
export function MegaMenu() {
  return (
    <nav aria-label="Product categories" className="hidden border-t lg:block">
      <ul className="mx-auto flex max-w-content items-center justify-center gap-1 px-4">
        {CATEGORIES.map((cat) => (
          <li key={cat.slug} className="group relative">
            <Link
              href={`/c/${cat.slug}`}
              className="flex items-center gap-1 px-3 py-3 text-[15px] font-medium text-brand-900 hover:text-brand-600 focus-visible:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {cat.label}
              <ChevronDown
                className="size-3.5 text-ink-400 transition-transform group-focus-within:rotate-180 group-hover:rotate-180"
                aria-hidden
              />
            </Link>
            <div className="invisible absolute left-1/2 top-full z-40 w-72 -translate-x-1/2 pt-1 opacity-0 transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border bg-white p-4 shadow-card-hover">
                <p className="mb-3 text-xs leading-relaxed text-ink-600">{cat.blurb}</p>
                <ul className="space-y-0.5">
                  {cat.subcategories.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/c/${cat.slug}/${s.slug}`}
                        className="block rounded-md px-2 py-1.5 text-sm text-ink-900 hover:bg-accent hover:text-brand-600 focus-visible:bg-accent focus-visible:outline-none"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/c/${cat.slug}`}
                  className="mt-3 block border-t pt-3 text-sm font-semibold text-brand-600 hover:underline"
                >
                  Shop all {cat.label.toLowerCase()}
                </Link>
              </div>
            </div>
          </li>
        ))}
        <li>
          <Link
            href="/deals"
            className="block px-3 py-3 text-[15px] font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            Deals
          </Link>
        </li>
      </ul>
    </nav>
  );
}
