// The distributor as used by services: mock failure controls applied from settings, and every
// call logged to distributor_logs (spec §4.4, §6).
import { getLoggedDistributor, mockControls, type Distributor } from '@/lib/distributor';
import type { Db, Json } from '@/lib/supabase/db';
import { getSettings, type StoreSettings } from '@/lib/settings';

export async function distributorFor(db: Db, settings?: StoreSettings): Promise<Distributor> {
  const s = settings ?? (await getSettings(db));
  mockControls()?.configure({ failRate: s.mockControls.fail_rate, rejectSkus: s.mockControls.reject_skus });
  return getLoggedDistributor(async (e) => {
    await db.from('distributor_logs').insert({
      method: e.method,
      request: e.request as Json,
      response: e.response as Json,
      status: e.status,
      duration_ms: e.duration_ms,
    });
  });
}
