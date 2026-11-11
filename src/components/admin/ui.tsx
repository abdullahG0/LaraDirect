// Small presentational pieces shared by admin pages. Server-safe (no hooks).
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatGBP } from '@/lib/utils/money';

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  tone = 'default',
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'default' | 'warn' | 'good';
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        'h-full rounded-xl border bg-card p-4 shadow-sm transition-colors',
        href && 'hover:border-primary/60',
        tone === 'warn' && 'border-amber-500/50 bg-amber-500/5',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'tabular mt-1 text-2xl font-semibold',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'warn' && 'text-amber-700 dark:text-amber-400',
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
  return href ? (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {body}
    </Link>
  ) : (
    body
  );
}

const STATUS_TONES: Record<string, string> = {
  pending_payment: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
  paid: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  submitting: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  submitted: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  confirmed: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  backordered: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  partially_shipped: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  shipped: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  delivered: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-300',
  cancelled: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  refunded: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  // stock
  in_stock: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  low_stock: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  out_of_stock: 'bg-red-500/10 text-red-700 dark:text-red-300',
  discontinued: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  backorder: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  // returns
  requested: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  authorised: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  received: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  rejected: 'bg-red-500/10 text-red-700 dark:text-red-300',
  // generic
  ok: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  error: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_TONES[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}

export function Money({
  value,
  className,
}: {
  value: number | string | null | undefined;
  className?: string;
}) {
  return (
    <span className={cn('tabular', className)}>
      {value === null || value === undefined ? '—' : formatGBP(Number(value))}
    </span>
  );
}

export function MarginText({ pct, floor }: { pct: number | null | undefined; floor?: number }) {
  if (pct === null || pct === undefined) return <span className="text-muted-foreground">—</span>;
  const bad = pct < 0 || (floor !== undefined && pct < floor - 0.01);
  return (
    <span
      className={cn(
        'tabular',
        bad
          ? 'font-semibold text-red-600 dark:text-red-400'
          : pct < 5
            ? 'text-amber-700 dark:text-amber-400'
            : '',
      )}
    >
      {pct.toFixed(1)}%
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
