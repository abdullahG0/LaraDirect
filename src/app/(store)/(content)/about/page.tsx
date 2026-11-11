import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/store/content-page';

export const metadata: Metadata = {
  title: 'About us',
  description: 'LaraDirect supplies laptops, iPads, headsets and classroom tech to UK teachers and schools.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <ContentPage
      title="About LaraDirect"
      intro="Tech for teachers, from people who understand classrooms."
      path="/about"
    >
      <p>
        LaraDirect is a UK online shop for the technology teachers and schools rely on every day: Chromebooks
        and laptops, iPads with tough cases, USB headsets for phonics and language lessons, document cameras,
        interactive displays and the cables, chargers and bags that keep it all running.
      </p>
      <h2>How we work</h2>
      <p>
        We work with TD SYNNEX, one of the UK’s largest technology distributors. When you order, your items
        ship directly from their UK warehouse, which keeps prices low and delivery fast. We stay responsible
        for your order from start to finish, including returns and warranty help.
      </p>
      <h2>Why teachers choose us</h2>
      <ul>
        <li>Clear prices including VAT, with ex-VAT prices for school budgets</li>
        <li>Free UK delivery on orders over £100</li>
        <li>School purchase order numbers on every invoice</li>
        <li>Bulk quotes for whole classes and trusts</li>
        <li>Friendly UK support from people who know education</li>
      </ul>
      <p>
        Buying for a school? Visit our <Link href="/education">schools page</Link> for bulk quotes, or{' '}
        <Link href="/contact">get in touch</Link>.
      </p>
    </ContentPage>
  );
}
