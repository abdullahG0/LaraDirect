import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/store/content-page';

export const metadata: Metadata = {
  title: 'Warranty',
  description:
    'Manufacturer warranties on everything we sell, plus your statutory rights. How to get help with a fault.',
  alternates: { canonical: '/warranty' },
};

export default function WarrantyPage() {
  return (
    <ContentPage
      title="Warranty"
      intro="Everything we sell is new and comes with the manufacturer’s warranty."
      path="/warranty"
    >
      <p>
        The warranty length is shown on each product page, usually 12 to 36 months. Laptops and tablets often
        include extra cover for education buyers; check the product’s specifications.
      </p>
      <h2>If something goes wrong</h2>
      <ul>
        <li>
          <strong>First 30 days:</strong> <Link href="/contact">contact us</Link> and we’ll arrange a
          replacement or refund.
        </li>
        <li>
          <strong>After 30 days:</strong> we’ll help you make a claim with the manufacturer, or handle it for
          you where we can.
        </li>
        <li>
          Keep your order number and, for laptops and tablets, the serial number shown on your order page once
          delivered.
        </li>
      </ul>
      <h2>Your statutory rights</h2>
      <p>
        A manufacturer’s warranty is in addition to your rights under the Consumer Rights Act 2015. Goods must
        be of satisfactory quality, fit for purpose and as described. If they’re not, we’ll put it right.
      </p>
    </ContentPage>
  );
}
