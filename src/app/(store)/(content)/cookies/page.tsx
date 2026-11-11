import type { Metadata } from 'next';
import { ContentPage } from '@/components/store/content-page';

export const metadata: Metadata = {
  title: 'Cookies',
  description:
    'LaraDirect uses only essential cookies and local storage. No tracking or advertising cookies.',
  alternates: { canonical: '/cookies' },
};

const ITEMS = [
  [
    'sb-*-auth-token',
    'Cookie',
    'Keeps you signed in to your account or the admin area',
    'Session / up to 1 week',
  ],
  ['ld-basket-v1', 'Local storage', 'Remembers what’s in your basket', 'Until you clear it'],
  ['ld-wishlist-v1', 'Local storage', 'Remembers your wishlist', 'Until you clear it'],
  ['ld-promo-v1', 'Local storage', 'Remembers a promo code you entered', 'Until you clear it'],
  ['ld-show-ex-vat', 'Local storage', 'Remembers if you prefer ex-VAT prices', 'Until you clear it'],
  [
    'ld-cookie-consent-v1',
    'Local storage',
    'Remembers that you’ve seen the cookie notice',
    'Until you clear it',
  ],
];

export default function CookiesPage() {
  return (
    <ContentPage
      title="Cookies"
      intro="We only use what’s needed to make the shop work. No tracking, no adverts."
      path="/cookies"
    >
      <p>
        Essential cookies and local storage don’t need your consent under UK law because the site can’t work
        without them. We don’t use analytics or advertising cookies. When you pay, Stripe may set its own
        cookies to prevent fraud.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Purpose</th>
              <th className="py-2">Kept for</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map(([name, type, purpose, kept]) => (
              <tr key={name} className="border-b align-top">
                <td className="py-2 pr-4 font-mono text-xs">{name}</td>
                <td className="py-2 pr-4">{type}</td>
                <td className="py-2 pr-4">{purpose}</td>
                <td className="py-2">{kept}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContentPage>
  );
}
