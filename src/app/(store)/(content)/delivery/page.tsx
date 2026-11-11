import type { Metadata } from 'next';
import { ContentPage } from '@/components/store/content-page';
import { getStoreSettings } from '@/lib/settings-server';
import { formatGBP } from '@/lib/utils/money';

export const metadata: Metadata = {
  title: 'Delivery',
  description:
    'Free UK delivery on orders over £100. Standard and next-day options, tracked to your door or school.',
  alternates: { canonical: '/delivery' },
};

export default async function DeliveryPage() {
  const s = await getStoreSettings();
  return (
    <ContentPage
      title="Delivery"
      intro={`Free standard UK delivery on orders over ${formatGBP(s.freeDeliveryThreshold)}.`}
      path="/delivery"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4">Service</th>
              <th className="py-2 pr-4">Delivery time</th>
              <th className="py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium">Standard</td>
              <td className="py-2 pr-4">2–4 working days</td>
              <td className="tabular py-2">
                {formatGBP(s.shippingRates.standard)}, free over {formatGBP(s.freeDeliveryThreshold)}
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 font-medium">Next working day</td>
              <td className="py-2 pr-4">Order by 2pm, Monday to Friday</td>
              <td className="tabular py-2">{formatGBP(s.shippingRates.next_day)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Where we deliver</h2>
      <p>
        We deliver to addresses across mainland UK. Some Highlands, Islands, Northern Ireland and BFPO
        addresses may take an extra day or two.
      </p>
      <h2>Tracking</h2>
      <p>
        As soon as your order is dispatched we email you a tracking link from the carrier (DPD, Royal Mail,
        DHL or UPS). You can also follow your order at any time from the link in your confirmation email.
      </p>
      <h2>Delivering to a school</h2>
      <p>
        Tick “Delivering to a school” at checkout and add the school name, so the parcel reaches reception
        rather than a classroom. Larger items such as interactive displays and charging trolleys may arrive on
        a pallet; we’ll contact you to arrange a time.
      </p>
      <h2>Items in more than one parcel</h2>
      <p>
        Bigger orders sometimes arrive in two parcels. Each one has its own tracking number, shown on your
        order page.
      </p>
    </ContentPage>
  );
}
