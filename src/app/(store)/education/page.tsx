import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Headphones, Laptop, Receipt, School, Truck } from 'lucide-react';
import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { EnquiryForm } from '@/components/store/enquiry-form';

export const metadata: Metadata = {
  title: 'For schools',
  description: 'Bulk quotes, school purchase orders and ex-VAT pricing for UK schools, academies and trusts.',
  alternates: { canonical: '/education' },
};

const BENEFITS = [
  {
    icon: Receipt,
    title: 'Purchase order numbers',
    text: 'Add your school PO at checkout. It’s on your order and invoice.',
  },
  {
    icon: FileText,
    title: 'Ex-VAT pricing',
    text: 'Switch any product page to ex-VAT prices to match your budget.',
  },
  {
    icon: Truck,
    title: 'Delivered to reception',
    text: 'Tick “Delivering to a school” so parcels don’t get lost.',
  },
  {
    icon: School,
    title: 'Bulk quotes',
    text: 'Kitting out a class or a whole trust? We’ll quote within one working day.',
  },
];

const POPULAR = [
  { icon: Laptop, label: 'Chromebooks', href: '/c/laptops/chromebooks' },
  { icon: Headphones, label: 'Classroom headsets', href: '/c/audio' },
  { icon: FileText, label: 'Document cameras', href: '/c/peripherals/document-cameras' },
];

export default function EducationPage() {
  return (
    <div className="mx-auto max-w-content px-4 pb-8 pt-6">
      <Breadcrumbs items={[{ label: 'For schools' }]} />
      <section className="mt-6 overflow-hidden rounded-3xl bg-brand-900 px-6 py-12 text-white sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-cta">For schools and trusts</p>
        <h1 className="mt-2 max-w-2xl font-heading text-3xl font-bold sm:text-5xl">
          Classroom tech, bought the way schools buy
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/80">
          Purchase orders, ex-VAT pricing, bulk quotes and delivery to reception. Everything a school business
          manager needs.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#quote"
            className="inline-flex h-12 items-center rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover"
          >
            Request a bulk quote
          </a>
          <Link
            href="/shop?edu=1"
            className="inline-flex h-12 items-center rounded-full border border-white/40 px-6 font-semibold hover:bg-white/10"
          >
            Shop education-ready tech
          </Link>
        </div>
      </section>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-2xl bg-white p-5 shadow-card">
            <Icon className="size-7 text-brand-600" aria-hidden />
            <h2 className="mt-3 font-heading text-lg font-semibold text-brand-900">{title}</h2>
            <p className="mt-1 text-sm text-ink-600">{text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section
          id="quote"
          aria-labelledby="quote-h"
          className="scroll-mt-48 rounded-2xl bg-white p-6 shadow-card sm:p-8"
        >
          <h2 id="quote-h" className="font-heading text-2xl font-bold text-brand-900">
            Request a bulk quote
          </h2>
          <p className="mt-1 text-ink-600">
            Tell us what you need and we’ll come back with prices, stock and delivery dates.
          </p>
          <div className="mt-6">
            <EnquiryForm
              kind="quote"
              submitLabel="Request quote"
              fields={[
                { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
                { name: 'email', label: 'Work email', type: 'email', required: true, autoComplete: 'email' },
                { name: 'school', label: 'School or trust', required: true, autoComplete: 'organization' },
                { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
                {
                  name: 'items',
                  label: 'What do you need?',
                  type: 'textarea',
                  required: true,
                  placeholder: 'e.g. 30 Chromebooks with cases, 30 USB headsets, 1 charging trolley',
                },
                { name: 'budget', label: 'Budget' },
                { name: 'deadline', label: 'Needed by' },
              ]}
            />
          </div>
        </section>
        <aside className="h-fit rounded-2xl bg-white p-6 shadow-card">
          <h2 className="font-heading text-lg font-semibold text-brand-900">Popular with schools</h2>
          <ul className="mt-3 space-y-2">
            {POPULAR.map(({ icon: Icon, label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-xl border p-3 font-medium text-brand-900 hover:border-brand-600"
                >
                  <Icon className="size-5 text-brand-600" aria-hidden /> {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-600">
            Paying by invoice?{' '}
            <Link href="/contact" className="font-medium text-brand-600 underline">
              Ask us
            </Link>{' '}
            about credit accounts for schools.
          </p>
        </aside>
      </div>
    </div>
  );
}
