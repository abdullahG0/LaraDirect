import { getPublicSettings } from '@/lib/settings-server';

// Spec §1: unobtrusive demo disclaimer. Needs NEXT_PUBLIC_DEMO_MODE=true and the admin
// "Demo banner" feature flag (on by default).
export async function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null;
  const settings = await getPublicSettings().catch(() => null);
  if (settings && !settings.demoBanner) return null;
  return (
    <div role="note" className="bg-brand-900 px-4 py-1.5 text-center text-xs text-white">
      Demo environment — no real orders are taken.
    </div>
  );
}
