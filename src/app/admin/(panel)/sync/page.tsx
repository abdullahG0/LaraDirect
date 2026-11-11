import { CheckCircle2, PlugZap } from 'lucide-react';
import { KpiCard, PageHeader, Panel, fmtDateTime, timeAgo } from '@/components/admin/ui';
import { requireAdminPage } from '@/lib/auth/admin';
import { can } from '@/lib/auth/roles';
import { CATEGORIES } from '@/lib/catalogue/categories';
import { distributorMode, getDistributor } from '@/lib/distributor';
import { createServiceClient } from '@/lib/supabase/server';
import { AdapterLog, SyncControls, SyncRunsTable } from './sync-client';

export const metadata = { title: 'Stock & sync' };
export const dynamic = 'force-dynamic';

export default async function SyncPage() {
  const admin = await requireAdminPage('viewer');
  const db = createServiceClient();
  const showLogs = can(admin.role, 'logs.view');
  const [runs, logs, lastOk] = await Promise.all([
    db.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(50),
    showLogs
      ? db
          .from('distributor_logs')
          .select('id, method, status, duration_ms, created_at, request, response')
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    db
      .from('sync_runs')
      .select('started_at')
      .eq('errors', 0)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const mode = distributorMode();
  const runRows = runs.data ?? [];
  const logRows = logs.data ?? [];
  const errorRate = logRows.length
    ? Math.round((logRows.filter((l) => l.status === 'error').length / logRows.length) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Stock & sync"
        description="The catalogue syncs from TD SYNNEX every 15 minutes. In mock mode each sync also simulates price and stock drift."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Distributor"
          value={
            <span className="flex items-center gap-2 text-lg">
              {mode === 'mock' ? (
                <PlugZap className="size-5 text-amber-600" />
              ) : (
                <CheckCircle2 className="size-5 text-emerald-600" />
              )}
              {getDistributor().name}
            </span>
          }
          sub={mode === 'mock' ? 'Mock adapter (demo data)' : 'Live TD SYNNEX API'}
        />
        <KpiCard
          label="Last successful sync"
          value={lastOk.data ? timeAgo(lastOk.data.started_at) : 'Never'}
          sub={lastOk.data ? fmtDateTime(lastOk.data.started_at) : undefined}
        />
        <KpiCard
          label="Runs (last 50)"
          value={runRows.length}
          sub={`${runRows.filter((r) => (r.errors ?? 0) > 0).length} with errors`}
        />
        <KpiCard
          label="Adapter error rate"
          value={showLogs ? `${errorRate}%` : '—'}
          sub="Last 100 calls"
          tone={errorRate > 10 ? 'warn' : 'default'}
        />
      </div>

      <SyncControls categories={CATEGORIES.map((c) => c.name)} />

      <Panel title="Sync runs" className="mt-4" bodyClassName="p-3">
        <SyncRunsTable runs={runRows} />
      </Panel>

      {showLogs && (
        <Panel
          title="Adapter call log"
          description="Every call to the distributor. Secrets and customer contact details are redacted."
          className="mt-4"
          bodyClassName="p-3"
        >
          <AdapterLog logs={logRows} />
        </Panel>
      )}
    </>
  );
}
