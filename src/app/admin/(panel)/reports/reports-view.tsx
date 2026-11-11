'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { adminFetch } from '@/components/admin/api';
import { BarList, ColumnChart, gbpShort } from '@/components/admin/charts';
import { KpiCard, Panel } from '@/components/admin/ui';
import type { ReportGroup, ReportRow } from '@/lib/admin/reports';
import { formatGBP } from '@/lib/utils/money';

const GROUP_LABELS: Record<ReportGroup, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  category: 'Category',
  brand: 'Brand',
  product: 'Product',
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const inputCls = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export function ReportsView() {
  const [group, setGroup] = useState<ReportGroup>('day');
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86400_000)));
  const [to, setTo] = useState(iso(new Date()));
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const qs = `group=${group}&from=${from}&to=${to}`;

  useEffect(() => {
    setLoading(true);
    adminFetch<{ rows: ReportRow[] }>(`/api/admin/reports?${qs}`)
      .then((r) => {
        setRows(r.rows);
        setError(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [qs]);

  const totals = (rows ?? []).reduce(
    (t, r) => ({
      revenue: t.revenue + r.revenueIncVat,
      ex: t.ex + r.revenueExVat,
      profit: t.profit + r.profit,
      units: t.units + r.units,
    }),
    { revenue: 0, ex: 0, profit: 0, units: 0 },
  );
  const timeBased = group === 'day' || group === 'week' || group === 'month';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Group by</span>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as ReportGroup)}
            className={inputCls}
          >
            {Object.entries(GROUP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">From</span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">To</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
        </label>
        <a
          href={`/api/admin/reports?${qs}&format=csv`}
          className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm hover:bg-accent"
        >
          <Download className="size-4" /> Export CSV
        </a>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenue (inc VAT)" value={formatGBP(totals.revenue)} />
        <KpiCard label="Revenue (ex VAT)" value={formatGBP(totals.ex)} />
        <KpiCard label="Gross profit" value={formatGBP(totals.profit)} tone="good" />
        <KpiCard
          label="Margin"
          value={`${totals.ex > 0 ? ((totals.profit / totals.ex) * 100).toFixed(1) : '0.0'}%`}
          sub={`${totals.units} units`}
        />
      </div>

      {rows && (
        <Panel title={`Revenue by ${GROUP_LABELS[group].toLowerCase()}`}>
          {timeBased ? (
            <ColumnChart
              data={rows.map((r) => ({ label: r.label, value: r.revenueIncVat }))}
              format={formatGBP}
              axisFormat={gbpShort}
              valueLabel="Revenue"
            />
          ) : (
            <BarList
              data={rows.slice(0, 12).map((r) => ({ label: r.label, value: r.revenueIncVat }))}
              valueLabel="Revenue"
            />
          )}
        </Panel>
      )}

      {rows && (
        <Panel title="Breakdown" bodyClassName="p-0">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">{GROUP_LABELS[group]}</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Units</th>
                  <th className="px-3 py-2 text-right">Revenue inc VAT</th>
                  <th className="px-3 py-2 text-right">Cost ex VAT</th>
                  <th className="px-3 py-2 text-right">Profit</th>
                  <th className="px-4 py-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No sales in this period.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.key} className="border-t">
                    <td className="max-w-[320px] truncate px-4 py-1.5">{r.label}</td>
                    <td className="tabular px-3 py-1.5 text-right">{r.orders}</td>
                    <td className="tabular px-3 py-1.5 text-right">{r.units}</td>
                    <td className="tabular px-3 py-1.5 text-right">{formatGBP(r.revenueIncVat)}</td>
                    <td className="tabular px-3 py-1.5 text-right">{formatGBP(r.cost)}</td>
                    <td className="tabular px-3 py-1.5 text-right">{formatGBP(r.profit)}</td>
                    <td className="tabular px-4 py-1.5 text-right">{r.marginPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
