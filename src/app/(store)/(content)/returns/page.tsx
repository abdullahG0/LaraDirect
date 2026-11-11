import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/store/content-page';
import { STORE } from '@/lib/store-config';

export const metadata: Metadata = {
  title: 'Returns',
  description: `${STORE.returnsDays}-day returns on LaraDirect orders. How to send something back and get a refund.`,
  alternates: { canonical: '/returns' },
};

export default function ReturnsPage() {
  return (
    <ContentPage
      title="Returns"
      intro={`Changed your mind? You have ${STORE.returnsDays} days to return most items.`}
      path="/returns"
    >
      <h2>Your right to cancel</h2>
      <p>
        Under UK consumer law you can cancel an online order within 14 days of receiving it, for any reason.
        We extend this to {STORE.returnsDays} days. Items should be unused and in their original packaging
        where possible.
      </p>
      <h2>How to return something</h2>
      <ul>
        <li>
          <Link href="/contact">Contact us</Link> with your order number and what you’d like to return.
        </li>
        <li>We’ll send you a returns reference and instructions within one working day.</li>
        <li>Pack the item securely and send it to the address we give you.</li>
        <li>We refund you within 14 days of receiving the item, to your original payment method.</li>
      </ul>
      <h2>Faulty items</h2>
      <p>
        If something arrives faulty or develops a fault, you’re entitled to a repair, replacement or refund.
        We cover the return postage. See our <Link href="/warranty">warranty page</Link> for faults after the
        first 30 days.
      </p>
      <h2>Things we can’t take back</h2>
      <ul>
        <li>Software licences once the product key has been revealed or activated</li>
        <li>Earbuds and in-ear headphones once the hygiene seal is broken, unless faulty</li>
      </ul>
      <p>
        LaraDirect is the seller of every item, so all returns and refunds are handled by us, even though
        items ship from our distributor.
      </p>
    </ContentPage>
  );
}
