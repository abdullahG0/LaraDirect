import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage, DemoNotice } from '@/components/store/content-page';
import { STORE } from '@/lib/store-config';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How LaraDirect collects, uses and protects your personal data.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy policy" path="/privacy" updated="November 2026">
      <DemoNotice>
        Demo placeholder. This policy must be reviewed by a data protection adviser before launch.
      </DemoNotice>
      <p>
        {STORE.company.legalName} (“we”) is the data controller for personal data collected through this
        website. We follow the UK GDPR and the Data Protection Act 2018.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Your name, email, phone number and delivery address, to fulfil and deliver your order</li>
        <li>Your order history and any messages you send us</li>
        <li>School name and purchase order number, if you give them</li>
        <li>Payment details are handled by Stripe. We never see or store your card number.</li>
      </ul>
      <h2>Who we share it with</h2>
      <ul>
        <li>TD SYNNEX, our distributor, who packs and ships your order (name, address, phone)</li>
        <li>Delivery companies, to deliver your parcel</li>
        <li>Stripe, to take payment</li>
        <li>Our email provider, to send order updates</li>
      </ul>
      <p>We never sell your data and we don’t use advertising or analytics cookies.</p>
      <h2>How long we keep it</h2>
      <p>
        Order records are kept for six years for tax purposes. Other data is deleted when no longer needed.
      </p>
      <h2>Your rights</h2>
      <p>
        You can ask for a copy of your data, ask us to correct it, or ask us to delete it. If you have an
        account you can download or delete your data yourself from <Link href="/account">My account</Link>.
        Otherwise, <Link href="/contact">contact us</Link>. You can also complain to the Information
        Commissioner’s Office (ico.org.uk).
      </p>
    </ContentPage>
  );
}
