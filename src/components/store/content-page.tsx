import Link from 'next/link';
import { Breadcrumbs } from './breadcrumbs';

const HELP_LINKS = [
  { href: '/delivery', label: 'Delivery' },
  { href: '/returns', label: 'Returns' },
  { href: '/warranty', label: 'Warranty' },
  { href: '/contact', label: 'Contact us' },
  { href: '/education', label: 'For schools' },
  { href: '/about', label: 'About us' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms and conditions' },
  { href: '/cookies', label: 'Cookies' },
];

/** Layout for content pages (step 8.1): readable column, help links on the side. */
export function ContentPage({
  title,
  intro,
  path,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  path: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6">
      <Breadcrumbs items={[{ label: title }]} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_260px]">
        <article className="rounded-2xl bg-white p-6 shadow-card sm:p-10">
          <h1 className="font-heading text-3xl font-bold text-brand-900 sm:text-4xl">{title}</h1>
          {intro && <p className="mt-3 text-lg text-ink-600">{intro}</p>}
          {updated && <p className="mt-2 text-sm text-ink-600">Last updated {updated}</p>}
          <div className="prose-content mt-8 space-y-6 text-[16px] leading-relaxed text-ink-900 [&_a]:font-medium [&_a]:text-brand-600 [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:mt-8 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-brand-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1">
            {children}
          </div>
        </article>
        <nav
          aria-label="Help and information"
          className="h-fit rounded-2xl bg-white p-5 shadow-card lg:sticky lg:top-44"
        >
          <h2 className="font-heading text-base font-semibold text-brand-900">Help and information</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {HELP_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={l.href === path ? 'page' : undefined}
                  className="block rounded-lg px-3 py-2 text-ink-900 hover:bg-accent aria-[current=page]:bg-brand-50 aria-[current=page]:font-semibold aria-[current=page]:text-brand-600"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function DemoNotice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-warn-500/40 bg-warn-500/10 p-3 text-sm">{children}</p>;
}
