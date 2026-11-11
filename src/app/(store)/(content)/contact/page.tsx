import type { Metadata } from 'next';
import { Clock, Mail, Phone } from 'lucide-react';
import { ContentPage } from '@/components/store/content-page';
import { EnquiryForm } from '@/components/store/enquiry-form';
import { STORE } from '@/lib/store-config';

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Questions about an order, a product or a school purchase? Get in touch with the LaraDirect team.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <ContentPage
      title="Contact us"
      intro="We reply within one working day, usually much sooner."
      path="/contact"
    >
      <ul className="grid gap-3 !space-y-0 sm:grid-cols-3">
        <li className="!ml-0 flex !list-none items-start gap-3 rounded-xl bg-surface-alt p-4">
          <Phone className="mt-0.5 size-5 text-brand-600" aria-hidden />
          <span>
            <strong className="block">Phone</strong>
            <a href={`tel:${STORE.phone.replace(/\s/g, '')}`}>{STORE.phone}</a>
          </span>
        </li>
        <li className="!ml-0 flex !list-none items-start gap-3 rounded-xl bg-surface-alt p-4">
          <Mail className="mt-0.5 size-5 text-brand-600" aria-hidden />
          <span>
            <strong className="block">Email</strong>
            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
          </span>
        </li>
        <li className="!ml-0 flex !list-none items-start gap-3 rounded-xl bg-surface-alt p-4">
          <Clock className="mt-0.5 size-5 text-brand-600" aria-hidden />
          <span>
            <strong className="block">Hours</strong>
            Mon–Fri, 8:30am–5pm
          </span>
        </li>
      </ul>
      <h2>Send us a message</h2>
      <p>If it’s about an order, include the order number (it starts with LD-) and we’ll look it up.</p>
      <EnquiryForm
        kind="contact"
        submitLabel="Send message"
        defaults={searchParams.order ? { orderNumber: searchParams.order } : {}}
        fields={[
          { name: 'name', label: 'Your name', required: true, autoComplete: 'name' },
          { name: 'email', label: 'Email address', type: 'email', required: true, autoComplete: 'email' },
          { name: 'orderNumber', label: 'Order number', placeholder: 'LD-100042', wide: true },
          { name: 'message', label: 'How can we help?', type: 'textarea', required: true },
        ]}
      />
    </ContentPage>
  );
}
