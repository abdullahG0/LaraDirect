import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RotateCcw, ShieldCheck, Star, Truck } from 'lucide-react';
import { Breadcrumbs, breadcrumbJsonLd } from '@/components/store/breadcrumbs';
import { Gallery } from '@/components/store/product/gallery';
import { PurchasePanel } from '@/components/store/product/purchase-panel';
import { ProductGrid } from '@/components/store/product-grid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { categoryByName, categoryHref } from '@/lib/catalogue/categories';
import { keySpecLine } from '@/lib/catalogue/format';
import { getFrequentlyBoughtTogether, getProductBySlug, getSimilar } from '@/lib/catalogue/queries';
import { sampleReviewsFor } from '@/lib/catalogue/sample-reviews';
import type { PublicProduct } from '@/lib/catalogue/types';
import { formatGBP } from '@/lib/utils/money';
import { STORE } from '@/lib/store-config';

type Props = { params: { slug: string } };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProductBySlug(params.slug);
  if (!p) return { title: 'Product not found' };
  const description = `${keySpecLine(p)}. ${formatGBP(p.priceIncVat)} inc. VAT. ${p.description.slice(0, 120)}…`;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: {
      type: 'website',
      title: p.name,
      description,
      url: `/p/${p.slug}`,
      images: p.images[0] ? [{ url: p.images[0], width: 800, height: 800, alt: p.name }] : undefined,
    },
  };
}

function productJsonLd(p: PublicProduct) {
  const availability: Record<PublicProduct['stockStatus'], string> = {
    in_stock: 'InStock',
    low_stock: 'LimitedAvailability',
    backorder: 'BackOrder',
    out_of_stock: 'OutOfStock',
    discontinued: 'Discontinued',
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.slug,
    ...(p.mpn && { mpn: p.mpn }),
    brand: { '@type': 'Brand', name: p.brand },
    category: [p.category, p.subcategory].filter(Boolean).join(' > '),
    image: p.images.map((i) => new URL(i, SITE_URL).toString()),
    offers: {
      '@type': 'Offer',
      url: new URL(`/p/${p.slug}`, SITE_URL).toString(),
      priceCurrency: 'GBP',
      price: p.priceIncVat.toFixed(2),
      availability: `https://schema.org/${availability[p.stockStatus]}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: STORE.name },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'GB' },
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: p.priceIncVat >= STORE.freeDeliveryThreshold ? 0 : STORE.standardDelivery,
          currency: 'GBP',
        },
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'GB',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: STORE.returnsDays,
      },
    },
    // No aggregateRating: the reviews shown are samples, not genuine customer reviews.
  };
}

/** JSON for <script> tags, with "<" escaped so product text can't close the tag. */
const safeJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex" aria-label={`${rating} out of 5 stars`} role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < rating ? 'size-4 fill-warn-500 text-warn-500' : 'size-4 text-ink-400'}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default async function ProductPage({ params }: Props) {
  const p = await getProductBySlug(params.slug);
  if (!p) notFound();

  const [bundle, similar] = await Promise.all([getFrequentlyBoughtTogether(p), getSimilar(p)]);
  const cat = categoryByName(p.category);
  const crumbs = [
    ...(cat ? [{ label: cat.label, href: `/c/${cat.slug}` }] : []),
    ...(p.subcategory ? [{ label: p.subcategory, href: categoryHref(p.category, p.subcategory) }] : []),
    { label: p.name },
  ];
  const reviews = sampleReviewsFor(p.category);
  const warranty = p.warrantyMonths
    ? `${p.warrantyMonths / 12 >= 1 && p.warrantyMonths % 12 === 0 ? `${p.warrantyMonths / 12}-year` : `${p.warrantyMonths}-month`} manufacturer warranty`
    : 'Manufacturer warranty';

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-6 lg:pb-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(productJsonLd(p)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJson(breadcrumbJsonLd(crumbs, SITE_URL)) }}
      />

      <Breadcrumbs items={crumbs} />

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        <Gallery images={p.images} name={p.name} />

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{p.brand}</p>
          <h1 className="mt-1 font-heading text-3xl font-bold leading-tight text-brand-900 sm:text-[34px]">
            {p.name}
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            {keySpecLine(p)}
            {p.mpn && (
              <>
                <span className="mx-2 text-ink-400">|</span>
                MPN: <span className="font-mono text-ink-900">{p.mpn}</span>
              </>
            )}
          </p>

          <div className="mt-5">
            <PurchasePanel product={p} />
          </div>

          <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <li className="flex items-start gap-2.5 rounded-xl bg-white p-3 shadow-card">
              <Truck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
              <span>
                <strong className="block text-brand-900">
                  {p.priceIncVat >= STORE.freeDeliveryThreshold
                    ? 'Free delivery'
                    : `Delivery ${formatGBP(STORE.standardDelivery)}`}
                </strong>
                <span className="text-ink-600">Next day {formatGBP(STORE.nextDayDelivery)}</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5 rounded-xl bg-white p-3 shadow-card">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
              <span>
                <strong className="block text-brand-900">Warranty</strong>
                <span className="text-ink-600">{warranty}</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5 rounded-xl bg-white p-3 shadow-card">
              <RotateCcw className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
              <span>
                <strong className="block text-brand-900">{STORE.returnsDays}-day returns</strong>
                <span className="text-ink-600">On unopened items</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      {bundle.length > 0 && (
        <section aria-labelledby="fbt" className="mt-14">
          <h2 id="fbt" className="font-heading text-2xl font-bold text-brand-900">
            Frequently bought together
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Popular add-ons for this {p.subcategory?.toLowerCase() ?? 'product'}.
          </p>
          <div className="mt-5">
            <ProductGrid products={bundle} columns={4} />
          </div>
        </section>
      )}

      <section className="mt-14">
        <Tabs defaultValue="overview">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-card">
            {[
              ['overview', 'Overview'],
              ['specs', 'Specifications'],
              ['delivery', 'Delivery & returns'],
              ['reviews', 'Reviews'],
            ].map(([v, label]) => (
              <TabsTrigger
                key={v}
                value={v!}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-600 data-[state=active]:bg-brand-900 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 rounded-2xl bg-white p-6 shadow-card sm:p-8">
            <TabsContent value="overview" className="mt-0">
              <h2 className="font-heading text-xl font-semibold text-brand-900">About this product</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-ink-900">{p.description}</p>
            </TabsContent>

            <TabsContent value="specs" className="mt-0">
              <h2 className="font-heading text-xl font-semibold text-brand-900">Specifications</h2>
              <table className="mt-4 w-full max-w-3xl text-sm">
                <tbody className="divide-y">
                  {[
                    ['Brand', p.brand],
                    ...Object.entries(p.specs),
                    ...(p.weightKg ? [['Weight (shipping)', `${p.weightKg} kg`]] : []),
                    ...(p.warrantyMonths ? [['Warranty', `${p.warrantyMonths} months`]] : []),
                    ...(p.mpn ? [['Manufacturer part number', p.mpn]] : []),
                  ].map(([k, v]) => (
                    <tr key={k} className="even:bg-surface-alt">
                      <th scope="row" className="w-1/3 py-2.5 pl-3 pr-4 text-left font-medium text-ink-600">
                        {k}
                      </th>
                      <td className="py-2.5 pr-3 text-ink-900">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="delivery" className="mt-0 max-w-3xl space-y-4 text-ink-900">
              <h2 className="font-heading text-xl font-semibold text-brand-900">Delivery and returns</h2>
              <p>
                <strong>Standard delivery:</strong> {formatGBP(STORE.standardDelivery)}, free on orders over{' '}
                {formatGBP(STORE.freeDeliveryThreshold)}. Dispatched within 1–2 working days.
              </p>
              <p>
                <strong>Next-day delivery:</strong> {formatGBP(STORE.nextDayDelivery)} when ordered before
                2pm, Monday to Thursday.
              </p>
              <p>
                <strong>Returns:</strong> you can return unopened items within {STORE.returnsDays} days. Your
                statutory rights for faulty goods are not affected.
              </p>
              <p>
                <strong>Schools:</strong> we can deliver to your school office and accept purchase order
                numbers at checkout.
              </p>
            </TabsContent>

            <TabsContent value="reviews" className="mt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold text-brand-900">Reviews</h2>
                <span className="rounded-full bg-warn-500/15 px-3 py-1 text-xs font-semibold text-warn-700">
                  Sample reviews for the demo, not from real customers
                </span>
              </div>
              <ul className="mt-4 grid gap-4 md:grid-cols-3">
                {reviews.map((r) => (
                  <li key={r.title} className="rounded-xl border p-4">
                    <Stars rating={r.rating} />
                    <h3 className="mt-2 font-semibold text-brand-900">{r.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-900">{r.body}</p>
                    <p className="mt-3 text-xs text-ink-600">
                      {r.author}, {r.role}
                    </p>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </div>
        </Tabs>
      </section>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-14">
          <h2 id="similar" className="font-heading text-2xl font-bold text-brand-900">
            Similar products
          </h2>
          <div className="mt-5">
            <ProductGrid products={similar} columns={4} />
          </div>
        </section>
      )}
    </div>
  );
}
