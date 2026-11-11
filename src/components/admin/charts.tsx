'use client';

// Admin charts (Recharts). Colours come from CSS variables (--chart-*) that have their own
// dark-mode steps. One y-axis per chart, thin marks, hover tooltips, a legend only when there is
// more than one series, and a "view as table" fallback so nothing relies on colour alone.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatGBP } from '@/lib/utils/money';

const AXIS = { stroke: 'var(--chart-axis)', fontSize: 11, tickLine: false, axisLine: false } as const;

export const gbpShort = (n: number) =>
  Math.abs(n) >= 1000 ? `£${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `£${Math.round(n)}`;

function TooltipBox({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string | number;
  format: (n: number) => string;
  labelFormat?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{labelFormat ? labelFormat(String(label)) : label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="tabular ml-auto font-medium">{format(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

function TableFallback({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as table</summary>
      <div className="mt-2 max-h-60 overflow-auto">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} className="border-b py-1 pr-3 text-left font-medium text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} className="tabular border-b py-1 pr-3">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export interface Series {
  key: string;
  label: string;
  color?: string;
}

const SERIES_COLORS = ['var(--chart-1)', 'var(--chart-2)'];

/** Time series as lines (e.g. revenue and profit over 30 days). Same unit on one axis. */
export function TrendChart<T extends Record<string, string | number>>({
  data,
  xKey,
  series,
  format = formatGBP,
  axisFormat = gbpShort,
  xFormat = (v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  height = 260,
}: {
  data: T[];
  xKey: keyof T & string;
  series: Series[];
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
  xFormat?: (v: string) => string;
  height?: number;
}) {
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${series.map((s) => s.label).join(' and ')} over time`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey={xKey} {...AXIS} tickFormatter={xFormat} minTickGap={24} />
            <YAxis {...AXIS} tickFormatter={axisFormat} width={52} />
            <Tooltip
              cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
              content={<TooltipBox format={format} labelFormat={xFormat} />}
            />
            {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? SERIES_COLORS[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableFallback
        columns={[xKey, ...series.map((s) => s.label)]}
        rows={data.map((d) => [
          xFormat(String(d[xKey])),
          ...series.map((s) => format(Number(d[s.key] ?? 0))),
        ])}
      />
    </div>
  );
}

/** Ranked horizontal bars, single series (top categories, top products, orders by status). */
export function BarList({
  data,
  valueType = 'money',
  format: formatProp,
  valueLabel = 'Value',
  height,
}: {
  data: { label: string; value: number }[];
  /** Use this from server components: functions can't be passed across the server/client boundary. */
  valueType?: 'money' | 'count';
  /** Custom formatter; only usable when the parent is a client component. */
  format?: (n: number) => string;
  valueLabel?: string;
  height?: number;
}) {
  const format = formatProp ?? (valueType === 'count' ? (n: number) => n.toLocaleString('en-GB') : formatGBP);
  if (!data.length) return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  const h = height ?? Math.max(120, data.length * 34 + 16);
  return (
    <div>
      <div style={{ height: h }} role="img" aria-label={`${valueLabel} by item`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 64, bottom: 0, left: 0 }}
            barCategoryGap={6}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              {...AXIS}
              width={150}
              tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
            />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<TooltipBox format={format} />} />
            <Bar
              dataKey="value"
              name={valueLabel}
              fill="var(--chart-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              isAnimationActive={false}
              label={{
                position: 'right',
                fontSize: 11,
                fill: 'var(--chart-axis)',
                formatter: (v: number) => format(v),
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableFallback columns={['Item', valueLabel]} rows={data.map((d) => [d.label, format(d.value)])} />
    </div>
  );
}

/** Vertical bars over ordered buckets (margin distribution, sales by period). */
export function ColumnChart({
  data,
  format = (n: number) => String(n),
  axisFormat,
  valueLabel = 'Count',
  height = 240,
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
  valueLabel?: string;
  height?: number;
}) {
  return (
    <div>
      <div style={{ height }} role="img" aria-label={`${valueLabel} by bucket`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="label" {...AXIS} minTickGap={8} />
            <YAxis {...AXIS} width={48} tickFormatter={axisFormat ?? format} allowDecimals={false} />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<TooltipBox format={format} />} />
            <Bar
              dataKey="value"
              name={valueLabel}
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableFallback columns={['Bucket', valueLabel]} rows={data.map((d) => [d.label, format(d.value)])} />
    </div>
  );
}

/** Price history: sell price (inc VAT) and cost (ex VAT) as step lines on one GBP axis. */
export function PriceHistoryChart({ data }: { data: { at: string; sell: number; cost: number }[] }) {
  if (data.length < 2)
    return <p className="py-8 text-center text-sm text-muted-foreground">Not enough price history yet.</p>;
  return (
    <TrendChart
      data={data}
      xKey="at"
      series={[
        { key: 'sell', label: 'Sell price (inc VAT)' },
        { key: 'cost', label: 'Cost (ex VAT)' },
      ]}
      xFormat={(v) =>
        new Date(v).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      }
      axisFormat={(n) => `£${Math.round(n)}`}
      height={220}
    />
  );
}
