import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Cable,
  GraduationCap,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  MonitorSmartphone,
  PcCase,
  Tablet,
  type LucideIcon,
} from 'lucide-react';
import { TrustBar } from '@/components/store/footer';
import { NewsletterForm } from '@/components/store/newsletter-form';
import { ProductGrid } from '@/components/store/product-grid';
import { CATEGORIES } from '@/lib/catalogue/categories';
import { getCategoryCounts, getDeals, getFeatured } from '@/lib/catalogue/queries';
import { formatGBP } from '@/lib/utils/money';

const ICONS: Record<string, LucideIcon> = {
  laptops: Laptop,
  tablets: Tablet,
  desktops: PcCase,
  monitors: Monitor,
  audio: Headphones,
  peripherals: Keyboard,
  'networking-power': Cable,
  accessories: MonitorSmartphone,
};

function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-heading text-2xl font-bold text-brand-900 sm:text-3xl">{title}</h2>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
        >
          {linkLabel} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [featured, deals, counts] = await Promise.all([getFeatured(8), getDeals(4), getCategoryCounts()]);
  const heroProducts = featured.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_20%,rgba(34,211,238,0.25),transparent_60%),radial-gradient(50%_60%_at_10%_100%,rgba(142,201,243,0.18),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-content items-center gap-10 px-4 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cta">
              <GraduationCap className="size-4" aria-hidden /> Tech for teachers and schools
            </p>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-[56px]">
              Classroom-ready tech, <span className="text-cta">delivered fast.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              Chromebooks, laptops, iPads, headsets and visualisers chosen for school life. Clear prices with
              VAT shown, purchase orders welcome, and free UK delivery over £100.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-cta px-6 font-semibold text-cta-foreground transition hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900"
              >
                Shop all products <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/education"
                className="inline-flex h-12 items-center rounded-full border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Buying for a school?
              </Link>
            </div>
          </div>

          {heroProducts.length === 3 && (
            <div className="relative mx-auto hidden h-[380px] w-full max-w-[480px] sm:block" aria-hidden>
              {heroProducts.map((p, i) => (
                <div
                  key={p.id}
                  className={[
                    'absolute overflow-hidden rounded-2xl bg-white p-3 shadow-2xl',
                    i === 0 && 'left-0 top-8 w-[58%] -rotate-3',
                    i === 1 && 'right-0 top-0 w-[48%] rotate-3',
                    i === 2 && 'bottom-0 right-[18%] w-[44%] -rotate-1',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="relative aspect-square">
                    {p.images[0] && (
                      <Image
                        src={p.images[0]}
                        alt=""
                        fill
                        sizes="280px"
                        className="object-contain"
                        priority
                      />
                    )}
                  </div>
                  <p className="tabular mt-1 px-1 font-heading text-lg font-bold text-brand-900">
                    {formatGBP(p.priceIncVat)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-content space-y-16 px-4 py-12 sm:py-16">
        {/* Trust bar */}
        <section aria-label="Why buy from LaraDirect" className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
          <TrustBar />
        </section>

        {/* Categories */}
        <section aria-labelledby="shop-categories">
          <div id="shop-categories">
            <SectionHeading title="Shop for teachers" href="/shop" linkLabel="All products" />
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {CATEGORIES.map((c) => {
              const Icon = ICONS[c.slug] ?? Laptop;
              return (
                <li key={c.slug}>
                  <Link
                    href={`/c/${c.slug}`}
                    className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none"
                  >
                    <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-cta group-hover:text-cta-foreground">
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="mt-4 font-heading text-lg font-semibold text-brand-900">{c.label}</span>
                    <span className="mt-1 line-clamp-2 text-sm text-ink-600">{c.blurb}</span>
                    <span className="mt-auto pt-3 text-xs font-semibold text-brand-600">
                      {counts[c.name] ?? 0} products
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section aria-labelledby="featured">
            <div id="featured">
              <SectionHeading title="Teacher favourites" href="/shop" linkLabel="Shop all" />
            </div>
            <div className="mt-6">
              <ProductGrid products={featured} />
            </div>
          </section>
        )}

        {/* Deals strip */}
        {deals.length > 0 && (
          <section aria-labelledby="deals" className="rounded-3xl bg-brand-900 p-5 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-cta">
                  Back-to-school deals
                </p>
                <h2 id="deals" className="mt-1 font-heading text-2xl font-bold text-white sm:text-3xl">
                  Priced below RRP
                </h2>
              </div>
              <Link
                href="/deals"
                className="inline-flex items-center gap-1 text-sm font-semibold text-cta hover:underline"
              >
                See all deals <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-6">
              <ProductGrid products={deals} />
            </div>
          </section>
        )}

        {/* Schools */}
        <section className="grid items-center gap-6 rounded-3xl bg-white p-6 shadow-card sm:p-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
              For schools and trusts
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-brand-900 sm:text-3xl">
              Buying for a whole department?
            </h2>
            <p className="mt-3 max-w-xl text-ink-600">
              Get a bulk quote, pay by purchase order, and see prices excluding VAT. We deliver straight to
              your school office.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/education"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Request a quote <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        {/* Newsletter */}
        <section className="rounded-3xl bg-brand-50 p-6 text-center sm:p-10">
          <h2 className="font-heading text-2xl font-bold text-brand-900">
            Offers for teachers, once a month
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-ink-600">
            New classroom tech and school-year deals. No spam, unsubscribe any time.
          </p>
          <div className="mt-5 flex justify-center">
            <NewsletterForm tone="light" />
          </div>
        </section>
      </div>
    </>
  );
}
