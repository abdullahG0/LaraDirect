import { PageHeader } from '@/components/admin/ui';
import { requireAdminPage } from '@/lib/auth/admin';
import { distributorMode, getDistributor } from '@/lib/distributor';
import { getSettings } from '@/lib/settings';
import { createServiceClient } from '@/lib/supabase/server';
import { SettingsForms } from './settings-forms';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const admin = await requireAdminPage('admin');
  const settings = await getSettings(createServiceClient());
  return (
    <>
      <PageHeader
        title="Settings"
        description={
          admin.role === 'owner'
            ? 'Changes apply straight away and are recorded in the audit log.'
            : 'Only the owner can change settings.'
        }
      />
      <SettingsForms
        settings={settings}
        distributor={{ name: getDistributor().name, mode: distributorMode() }}
        demoMode={process.env.NEXT_PUBLIC_DEMO_MODE === 'true'}
        envFailRate={process.env.MOCK_FAIL_RATE ?? '0'}
        envRejectSkus={process.env.MOCK_REJECT_SKUS ?? ''}
      />
    </>
  );
}
