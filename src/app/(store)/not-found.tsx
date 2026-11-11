import Link from 'next/link';
import { CATEGORIES } from '@/lib/catalogue/categories';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="font-heading text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-3 font-heading text-3xl font-bold text-brand-900">We can’t find that page</h1>
      <p className="mt-2 text-ink-600">It may have moved, or the product may no longer be available.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CATEGORIES.slice(0, 5).map((c) => (
          <Link
            key={c.slug}
            href={`/c/${c.slug}`}
            className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:border-brand-600"
          >
            {c.label}
          </Link>
        ))}
      </div>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover"
      >
        Back to the home page
      </Link>
    </div>
  );
}
