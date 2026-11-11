import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Clock,
  PackageX,
  PoundSterling,
  RefreshCw,
  TrendingDown,
} from 'lucide-react';
import { BarList, TrendChart } from '@/components/admin/charts';
import { KpiCard, PageHeader, Panel, timeAgo } from '@/components/admin/ui';
import { getDashboardData, type AttentionItem } from '@/lib/admin/metrics';
import { requireAdminPage } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';
import { formatGBP } from '@/lib/utils/money';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const ATTENTION_ICONS: Record<AttentionItem['kind'], typeof AlertTriangle> = {
  failed: CircleAlert,
  retrying: Clock,
  backordered: Clock,
  margin_alert: TrendingDown,
  below_floor: PoundSterling,
  out_of_stock: PackageX,
  sync_error: RefreshCw,
};

export default async function AdminDashboardPage() {
  await requireAdminPage('viewer');
  const d = await getDashboardData(createServiceClient());
  const k = d.kpis;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          d.lastSync
            ? `Last catalogue sync ${timeAgo(d.lastSync.started_at)}`
            : 'No catalogue sync has run yet'
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Orders today" value={k.ordersToday} href="/admin/orders" />
        <KpiCard label="Orders, 7 days" value={k.orders7} />
        <KpiCard label="Orders, 30 days" value={k.orders30} />
        <KpiCard
          label="Revenue, 30 days"
          value={formatGBP(k.revenue30)}
          sub={`Avg order ${formatGBP(k.avgOrderValue30)}`}
        />
        <KpiCard label="Gross profit, 30 days" value={formatGBP(k.profit30)} tone="good" />
        <KpiCard label="Average margin" value={`${k.avgMargin30.toFixed(1)}%`} sub="On goods ex VAT" />
        <KpiCard
          label="Needs attention"
          value={k.needsAttention}
          tone={k.needsAttention ? 'warn' : 'default'}
          sub={`${k.belowFloor} below margin floor`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          title="Revenue and gross profit"
          description="Last 30 days, inc VAT revenue vs profit ex VAT"
          className="xl:col-span-2"
        >
          <TrendChart
            data={d.daily}
            xKey="date"
            series={[
              { key: 'revenue', label: 'Revenue' },
              { key: 'profit', label: 'Gross profit' },
            ]}
          />
        </Panel>
        <Panel
          title="Needs attention"
          description={`${d.attention.length} item${d.attention.length === 1 ? '' : 's'}`}
          bodyClassName="p-0"
        >
          {d.attention.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              All clear. Nothing needs you right now.
            </p>
          ) : (
            <ul className="max-h-[340px] divide-y overflow-y-auto">
              {d.attention.map((a, i) => {
                const Icon = ATTENTION_ICONS[a.kind];
                return (
                  <li key={i}>
                    <Link href={a.href} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                      <Icon
                        className={
                          a.kind === 'failed'
                            ? 'mt-0.5 size-4 shrink-0 text-red-600'
                            : 'mt-0.5 size-4 shrink-0 text-amber-600'
                        }
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{a.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Orders by status" description="Last 30 days">
          <BarList
            data={d.byStatus.map((s) => ({ label: s.status.replace(/_/g, ' '), value: s.count }))}
            valueType="count"
            valueLabel="Orders"
          />
        </Panel>
        <Panel title="Top categories" description="Revenue, last 30 days">
          <BarList
            data={d.top.categories.map((c) => ({ label: c.name, value: c.revenue }))}
            valueLabel="Revenue"
          />
        </Panel>
        <Panel title="Top products" description="Revenue, last 30 days">
          <BarList
            data={d.top.products.map((p) => ({ label: p.name, value: p.revenue }))}
            valueLabel="Revenue"
          />
        </Panel>
      </div>

      <Panel
        title="Recent activity"
        className="mt-4"
        bodyClassName="p-0"
        actions={
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            All orders <ArrowRight className="size-3" />
          </Link>
        }
      >
        <ul className="divide-y">
          {d.activity.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">No activity yet.</li>
          )}
          {d.activity.map((a, i) => (
            <li key={i}>
              <Link
                href={a.href}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-muted/50"
              >
                <span className="truncate">{a.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a.actor} · {timeAgo(a.at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
