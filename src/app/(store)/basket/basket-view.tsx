'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, Loader2, Minus, Plus, ShoppingBasket, Trash2, Truck } from 'lucide-react';
import { useBasket, useBasketQuote } from '@/components/store/basket-provider';
import { FreeDeliveryProgress, PromoCodeForm, TotalsList } from '@/components/store/basket-summary';
import { Skeleton } from '@/components/ui/skeleton';
import { formatGBP } from '@/lib/utils/money';

export function BasketView() {
  const { lines, ready, setQuantity, remove } = useBasket();
  const { quote, loading, error } = useBasketQuote('standard');
  const priced = new Map(quote?.lines.map((l) => [l.productId, l]) ?? []);
  const blocked = quote?.lines.some((l) => !l.available || l.quantity > l.maxQty) ?? false;

  if (!ready) {
    return (
      <div className="mt-6 space-y-3" aria-hidden>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
        <ShoppingBasket className="mx-auto size-12 text-ink-400" aria-hidden />
        <h2 className="mt-3 font-heading text-xl font-semibold text-brand-900">Your basket is empty</h2>
        <p className="mt-1 text-ink-600">Find laptops, headsets and more for your classroom.</p>
        <Link
          href="/shop"
          className="mt-5 inline-flex h-11 items-center rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <ul className="space-y-3">
        {lines.map((l) => {
          const q = priced.get(l.productId);
          const max = q?.maxQty ?? 99;
          return (
            <li key={l.productId} className="flex gap-4 rounded-2xl bg-white p-4 shadow-card">
              <Link
                href={`/p/${l.slug}`}
                className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface-alt sm:size-24"
              >
                {l.image && <Image src={l.image} alt="" fill sizes="96px" className="object-contain" />}
                <span className="sr-only">{l.name}</span>
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{l.brand}</p>
                <Link
                  href={`/p/${l.slug}`}
                  className="line-clamp-2 font-semibold text-brand-900 hover:underline"
                >
                  {l.name}
                </Link>
                <p className="tabular mt-0.5 text-sm text-ink-600">{formatGBP(l.priceIncVat)} each</p>
                {q?.message && (
                  <p
                    className={`mt-1 flex items-center gap-1 text-sm ${q.available ? 'text-warn-700' : 'text-danger-500'}`}
                  >
                    <AlertTriangle className="size-4" aria-hidden /> {q.message}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex h-10 items-center rounded-full border">
                    <button
                      type="button"
                      onClick={() => setQuantity(l.productId, l.quantity - 1)}
                      className="grid size-10 place-items-center rounded-full hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Decrease quantity of ${l.name}`}
                    >
                      <Minus className="size-4" aria-hidden />
                    </button>
                    <span
                      className="tabular w-8 text-center font-semibold"
                      aria-label={`Quantity ${l.quantity}`}
                    >
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(l.productId, Math.min(max, l.quantity + 1))}
                      disabled={l.quantity >= max}
                      className="grid size-10 place-items-center rounded-full hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                      aria-label={`Increase quantity of ${l.name}`}
                    >
                      <Plus className="size-4" aria-hidden />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular font-heading text-lg font-bold text-brand-900">
                      {formatGBP(l.priceIncVat * l.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(l.productId)}
                      className="grid size-9 place-items-center rounded-full text-ink-600 hover:bg-accent hover:text-danger-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Remove ${l.name}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside
        aria-label="Order summary"
        className="h-fit space-y-5 rounded-2xl bg-white p-6 shadow-card lg:sticky lg:top-44"
      >
        <h2 className="font-heading text-xl font-bold text-brand-900">Summary</h2>
        {quote ? (
          <>
            <FreeDeliveryProgress totals={quote.totals} threshold={quote.freeDeliveryThreshold} />
            <PromoCodeForm totals={quote.totals} loading={loading} />
            <TotalsList totals={quote.totals} />
            <p className="flex items-start gap-2 text-xs text-ink-600">
              <Truck className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
              Standard delivery 2–4 working days. Next-day delivery available at checkout.
            </p>
          </>
        ) : error ? (
          <p className="text-sm text-danger-500" role="alert">
            {error}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Checking prices and stock…
          </p>
        )}
        {blocked ? (
          <p className="rounded-xl bg-danger-500/10 p-3 text-sm text-danger-500" role="alert">
            Please fix the items marked above before checking out.
          </p>
        ) : (
          <Link
            href="/checkout"
            aria-disabled={!quote}
            className="flex h-12 w-full items-center justify-center rounded-full bg-cta font-semibold text-cta-foreground hover:bg-cta-hover aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            Checkout securely
          </Link>
        )}
      </aside>
    </div>
  );
}
