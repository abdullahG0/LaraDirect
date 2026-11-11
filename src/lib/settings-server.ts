import 'server-only';
import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { DEFAULT_SETTINGS, getSettings, type StoreSettings } from '@/lib/settings';

export const SETTINGS_TAG = 'settings';

/** Store settings for storefront pages and APIs, cached 60 s and revalidated when admins save. */
export const getStoreSettings = unstable_cache(
  async (): Promise<StoreSettings> => {
    try {
      return await getSettings(createServiceClient());
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  ['store-settings-v1'],
  { revalidate: 60, tags: [SETTINGS_TAG] },
);

/** Only the settings the browser needs (no promo code list, no mock controls). */
export async function getPublicSettings() {
  const s = await getStoreSettings();
  return {
    vatRate: s.vatRate,
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    shippingRates: s.shippingRates,
    demoBanner: s.featureFlags.demo_banner,
    company: s.company,
  };
}
export type PublicSettings = Awaited<ReturnType<typeof getPublicSettings>>;
