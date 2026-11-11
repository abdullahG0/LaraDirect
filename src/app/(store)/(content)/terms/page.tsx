import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage, DemoNotice } from '@/components/store/content-page';
import { STORE } from '@/lib/store-config';

export const metadata: Metadata = {
  title: 'Terms and conditions',
  description: 'The terms that apply when you buy from LaraDirect.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <ContentPage title="Terms and conditions" path="/terms" updated="November 2026">
      <DemoNotice>
        Demo placeholder. These terms must be reviewed by a legal adviser before launch. No real orders are
        taken on this site.
      </DemoNotice>
      <h2>1. Who we are</h2>
      <p>
        This website is run by {STORE.company.legalName}, registered in England and Wales (company number{' '}
        {STORE.company.number}), VAT number {STORE.company.vat}. We are the seller of every product on this
        site.
      </p>
      <h2>2. Prices</h2>
      <p>
        Prices are in pounds sterling and include VAT at the current rate. Delivery charges are shown before
        you pay. If we’ve made an obvious pricing error we’ll contact you before dispatch and you can cancel
        for a full refund.
      </p>
      <h2>3. Your order</h2>
      <p>
        Your order is accepted when we email to confirm payment. Items are supplied and shipped by our
        distributor, TD SYNNEX, on our behalf. If an item becomes unavailable we’ll tell you straight away and
        refund you for it.
      </p>
      <h2>4. Delivery</h2>
      <p>
        Delivery times are estimates. See our <Link href="/delivery">delivery page</Link>. Risk passes to you
        on delivery.
      </p>
      <h2>5. Cancelling and returns</h2>
      <p>
        You can cancel within 14 days of receiving your goods under the Consumer Contracts Regulations. We
        extend this to {STORE.returnsDays} days. See our <Link href="/returns">returns page</Link>.
      </p>
      <h2>6. Faulty goods</h2>
      <p>Nothing in these terms affects your statutory rights under the Consumer Rights Act 2015.</p>
      <h2>7. School purchases</h2>
      <p>Schools may add a purchase order number at checkout. It appears on your order and invoice.</p>
      <h2>8. Law</h2>
      <p>These terms are governed by the law of England and Wales.</p>
    </ContentPage>
  );
}
