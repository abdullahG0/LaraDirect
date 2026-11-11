'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CircleHelp,
  ExternalLink,
  Mail,
  Package,
  PackageCheck,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useBasket } from '@/components/store/basket-provider';
import { TIMELINE_STEPS } from '@/lib/orders/lifecycle';
import type { PublicOrder } from '@/lib/orders/public';
import { formatGBP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';

const FINAL = new Set(['delivered', 'cancelled', 'refunded']);
const STEP_ICONS = [Check, Package, Truck, PackageCheck];

const fmtDate = (iso: string | null, withTime = true) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(withTime && { hour: '2-digit', minute: '2-digit' }),
      })
    : '';

export function OrderTracker({
  initial,
  token,
  justPlaced,
  demoMode,
}: {
  initial: PublicOrder;
  token: string;
  justPlaced: boolean;
  demoMode: boolean;
}) {
  const [order, setOrder] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [openEmail, setOpenEmail] = useState<number | null>(null);
  const { clear } = useBasket();

  // Clear the basket once payment is confirmed for the order we just placed.
  useEffect(() => {
    try {
      const pending = window.sessionStorage.getItem('ld-pending-order');
      if (pending === order.orderNumber && order.status !== 'pending_payment') {
        clear();
        window.sessionStorage.removeItem('ld-pending-order');
      }
    } catch {
      // ignore
    }
  }, [order.orderNumber, order.status, clear]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}?token=${token}`, {
        cache: 'no-store',
      });
      if (res.ok) setOrder(await res.json());
    } finally {
      setRefreshing(false);
    }
  };

  // Live updates while the order is moving (spec: "page updates as status moves").
  useEffect(() => {
    if (FINAL.has(order.status)) return;
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status]);

  const stopped = order.timelineIndex < 0;
  const problem = order.status === 'failed';
  const delayed = order.status === 'backordered';

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white p-6 shadow-card">
        {justPlaced && order.status !== 'pending_payment' && (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-success-600/10 px-3 py-1 text-sm font-semibold text-success-600">
            <Check className="size-4" aria-hidden /> Thank you, your order is confirmed
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-brand-900">Order {order.orderNumber}</h1>
            <p className="mt-1 text-ink-600">
              Placed {fmtDate(order.createdAt)} · Confirmation sent to{' '}
              <strong className="text-ink-900">{order.email}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} aria-hidden /> Refresh
          </button>
        </div>

        <p className="mt-5 text-lg font-semibold text-brand-900" aria-live="polite">
          {order.status === 'pending_payment' ? 'Waiting for payment confirmation…' : order.statusLabel}
        </p>
        {problem && (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-warn-500/10 p-3 text-sm text-ink-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-700" aria-hidden />
            Something went wrong passing your order to our warehouse. Our team has been alerted and will sort
            it out. You don’t need to do anything.
          </p>
        )}
        {delayed && (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-warn-500/10 p-3 text-sm text-ink-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn-700" aria-hidden />
            One or more items are awaiting stock. We’ll dispatch as soon as they arrive.
          </p>
        )}

        {!stopped && (
          <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Order progress">
            {TIMELINE_STEPS.map((label, i) => {
              const Icon = STEP_ICONS[i]!;
              const done = i <= order.timelineIndex && order.status !== 'pending_payment';
              const current = i === order.timelineIndex;
              return (
                <li
                  key={label}
                  className="flex flex-col items-center text-center"
                  aria-current={current ? 'step' : undefined}
                >
                  <div className="relative flex w-full items-center">
                    <span
                      className={cn(
                        'h-1 flex-1 rounded-full',
                        i === 0 ? 'invisible' : done ? 'bg-brand-600' : 'bg-surface-alt',
                      )}
                    />
                    <span
                      className={cn(
                        'grid size-10 place-items-center rounded-full border-2',
                        done
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-border bg-white text-ink-400',
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span
                      className={cn(
                        'h-1 flex-1 rounded-full',
                        i === TIMELINE_STEPS.length - 1
                          ? 'invisible'
                          : i < order.timelineIndex
                            ? 'bg-brand-600'
                            : 'bg-surface-alt',
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-xs sm:text-sm',
                      done ? 'font-semibold text-brand-900' : 'text-ink-600',
                    )}
                  >
                    {label}
                  </span>
                  <span className="sr-only">{done ? '(done)' : '(to do)'}</span>
                </li>
              );
            })}
          </ol>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {order.shipments.length > 0 && (
            <section aria-labelledby="ship-h" className="rounded-2xl bg-white p-6 shadow-card">
              <h2 id="ship-h" className="font-heading text-xl font-bold text-brand-900">
                Delivery tracking
              </h2>
              <ul className="mt-4 space-y-3">
                {order.shipments.map((s) => (
                  <li
                    key={s.trackingNumber}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                  >
                    <div>
                      <p className="font-semibold text-ink-900">
                        {s.carrier} · <span className="tabular">{s.trackingNumber}</span>
                      </p>
                      <p className="text-sm text-ink-600">
                        Dispatched {fmtDate(s.shippedAt)}
                        {s.deliveredAt && ` · Delivered ${fmtDate(s.deliveredAt)}`}
                      </p>
                    </div>
                    {s.trackingUrl && (
                      <a
                        href={s.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                      >
                        Track with {s.carrier} <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="items-h" className="rounded-2xl bg-white p-6 shadow-card">
            <h2 id="items-h" className="font-heading text-xl font-bold text-brand-900">
              Items
            </h2>
            <ul className="mt-4 divide-y">
              {order.items.map((i) => (
                <li key={i.name} className="flex gap-4 py-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                    {i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-contain" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    {i.slug ? (
                      <Link href={`/p/${i.slug}`} className="font-medium text-brand-900 hover:underline">
                        {i.name}
                      </Link>
                    ) : (
                      <p className="font-medium text-brand-900">{i.name}</p>
                    )}
                    <p className="text-sm text-ink-600">Qty {i.quantity}</p>
                    {i.serialNumbers.length > 0 && (
                      <p className="mt-1 text-xs text-ink-600">
                        Serial number{i.serialNumbers.length > 1 ? 's' : ''}:{' '}
                        <span className="tabular font-medium text-ink-900">{i.serialNumbers.join(', ')}</span>
                      </p>
                    )}
                  </div>
                  <span className="tabular font-semibold">{formatGBP(i.unitPriceIncVat * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          {order.events.length > 0 && (
            <section aria-labelledby="hist-h" className="rounded-2xl bg-white p-6 shadow-card">
              <h2 id="hist-h" className="font-heading text-xl font-bold text-brand-900">
                Order history
              </h2>
              <ol className="mt-4 space-y-3 border-l-2 border-surface-alt pl-4">
                {[...order.events].reverse().map((e, idx) => (
                  <li key={`${e.at}-${idx}`} className="relative">
                    <span
                      className="absolute -left-[23px] top-1.5 size-3 rounded-full bg-brand-600"
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-ink-900">{e.label}</p>
                    <p className="text-xs text-ink-600">{fmtDate(e.at)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {demoMode && order.emails.length > 0 && (
            <section
              aria-labelledby="email-h"
              className="rounded-2xl border border-dashed border-brand-600/40 bg-white p-6"
            >
              <h2
                id="email-h"
                className="flex items-center gap-2 font-heading text-lg font-bold text-brand-900"
              >
                <Mail className="size-5 text-brand-600" aria-hidden /> Emails sent (demo preview)
              </h2>
              <ul className="mt-3 space-y-2">
                {order.emails.map((e, idx) => (
                  <li key={idx} className="rounded-xl border">
                    <button
                      type="button"
                      onClick={() => setOpenEmail(openEmail === idx ? null : idx)}
                      aria-expanded={openEmail === idx}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-medium text-ink-900">{e.subject}</span>
                      <span className="shrink-0 text-xs text-ink-600">{fmtDate(e.sentAt)}</span>
                    </button>
                    {openEmail === idx && (
                      <pre className="whitespace-pre-wrap border-t bg-surface-alt p-3 font-sans text-sm text-ink-900">
                        {e.text}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-6">
          <section aria-labelledby="sum-h" className="rounded-2xl bg-white p-6 shadow-card">
            <h2 id="sum-h" className="font-heading text-lg font-bold text-brand-900">
              Summary
            </h2>
            <dl className="tabular mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Items</dt>
                <dd>{formatGBP(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-success-600">
                  <dt>Discount</dt>
                  <dd>−{formatGBP(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-600">
                  {order.deliveryMethod === 'next_day' ? 'Next-day delivery' : 'Standard delivery'}
                </dt>
                <dd>{order.shipping === 0 ? 'Free' : formatGBP(order.shipping)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold text-brand-900">
                <dt>Total paid</dt>
                <dd>{formatGBP(order.total)}</dd>
              </div>
              <div className="flex justify-between text-xs text-ink-600">
                <dt>Includes VAT of</dt>
                <dd>{formatGBP(order.vat)}</dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="addr-h" className="rounded-2xl bg-white p-6 shadow-card">
            <h2 id="addr-h" className="font-heading text-lg font-bold text-brand-900">
              Delivering to
            </h2>
            <address className="mt-2 text-sm not-italic leading-relaxed text-ink-900">
              {order.shipTo.name}
              <br />
              {order.shipTo.company && (
                <>
                  {order.shipTo.company}
                  <br />
                </>
              )}
              {order.shipTo.line1}
              <br />
              {order.shipTo.line2 && (
                <>
                  {order.shipTo.line2}
                  <br />
                </>
              )}
              {order.shipTo.city} {order.shipTo.postcode}
            </address>
            {order.schoolPoNumber && (
              <p className="mt-2 text-sm text-ink-600">School PO: {order.schoolPoNumber}</p>
            )}
          </section>
          <Link
            href={`/contact?order=${encodeURIComponent(order.orderNumber)}`}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-brand-900 font-semibold text-brand-900 hover:bg-white"
          >
            <CircleHelp className="size-5" aria-hidden /> Need help with this order?
          </Link>
        </aside>
      </div>
    </div>
  );
}
