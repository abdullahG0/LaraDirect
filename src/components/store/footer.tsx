import Link from 'next/link';
import { BadgeCheck, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { CATEGORIES } from '@/lib/catalogue/categories';
import { formatGBP } from '@/lib/utils/money';
import { STORE } from '@/lib/store-config';
import { Logo } from './logo';
import { NewsletterForm } from './newsletter-form';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      ...CATEGORIES.slice(0, 6).map((c) => ({ label: c.label, href: `/c/${c.slug}` })),
      { label: 'Deals', href: '/deals' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Contact us', href: '/contact' },
      { label: 'Delivery', href: '/delivery' },
      { label: 'Returns', href: '/returns' },
      { label: 'Warranty', href: '/warranty' },
      { label: 'Track an order', href: '/account' },
    ],
  },
  {
    title: 'LaraDirect',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'For schools', href: '/education' },
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms and conditions', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay'];

export function TrustBar() {
  const items = [
    {
      icon: Truck,
      title: 'Free UK delivery',
      text: `On orders over ${formatGBP(STORE.freeDeliveryThreshold).replace('.00', '')}`,
    },
    { icon: RotateCcw, title: `${STORE.returnsDays}-day returns`, text: 'Change your mind? No problem' },
    { icon: ShieldCheck, title: 'Secure checkout', text: 'Payments handled by Stripe' },
    { icon: BadgeCheck, title: 'Genuine products', text: 'Sourced from UK distribution' },
  ];
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
            <Icon className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold text-brand-900">{title}</span>
            <span className="block text-xs text-ink-600">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 bg-brand-900 text-white/80">
      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo inverted className="text-2xl" />
          <p className="max-w-sm text-sm leading-relaxed">
            Laptops, iPads, headsets and classroom tech for UK teachers and schools. Plain prices including
            VAT, fast delivery, and help from people who know education.
          </p>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-white">Get offers for teachers</h2>
            <NewsletterForm />
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 font-heading text-base font-semibold text-white">{col.title}</h2>
            <ul className="space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="hover:text-cta hover:underline focus-visible:text-cta focus-visible:outline-none"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-6 text-xs md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-2" aria-label="Accepted payment methods">
            {PAYMENT_METHODS.map((m) => (
              <li
                key={m}
                className="rounded border border-white/20 bg-white/5 px-2 py-1 font-medium text-white"
              >
                {m}
              </li>
            ))}
          </ul>
          <p className="leading-relaxed text-white/60">
            © {new Date().getFullYear()} {STORE.company.legalName}. Registered in England and Wales, company
            no. {STORE.company.number}. VAT no. {STORE.company.vat}. {STORE.company.address}.
          </p>
        </div>
      </div>
    </footer>
  );
}
