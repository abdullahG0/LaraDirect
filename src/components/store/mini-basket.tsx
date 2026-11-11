'use client';

// Slide-out mini basket (spec §10.4): line totals, free-delivery progress, VAT breakdown.
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, ShoppingBasket, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatGBP } from '@/lib/utils/money';
import { useBasket, useBasketQuote } from './basket-provider';
import { FreeDeliveryProgress, TotalsList } from './basket-summary';

export function MiniBasket() {
  const { lines, drawerOpen, setDrawerOpen, remove, count } = useBasket();
  const { quote, loading } = useBasketQuote('standard', drawerOpen);
  const priced = new Map(quote?.lines.map((l) => [l.productId, l]) ?? []);

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="font-heading text-xl text-brand-900">Your basket</SheetTitle>
          <SheetDescription>
            {count === 0 ? 'Your basket is empty' : `${count} ${count === 1 ? 'item' : 'items'}`}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBasket className="size-12 text-ink-400" aria-hidden />
            <p className="text-ink-600">Nothing here yet.</p>
            <Link
              href="/shop"
              onClick={() => setDrawerOpen(false)}
              className="inline-flex h-11 items-center rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-5">
              {lines.map((l) => {
                const q = priced.get(l.productId);
                return (
                  <li key={l.productId} className="flex gap-3 py-4">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
                      {l.image && <Image src={l.image} alt="" fill sizes="64px" className="object-contain" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/p/${l.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="line-clamp-2 text-sm font-semibold text-brand-900 hover:underline"
                      >
                        {l.name}
                      </Link>
                      <p className="mt-1 text-xs text-ink-600">
                        Qty {l.quantity} × <span className="tabular">{formatGBP(l.priceIncVat)}</span>
                      </p>
                      {q?.message && (
                        <p className={`mt-1 text-xs ${q.available ? 'text-warn-700' : 'text-danger-500'}`}>
                          {q.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <span className="tabular text-sm font-bold text-brand-900">
                        {formatGBP(l.priceIncVat * l.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(l.productId)}
                        className="grid size-8 place-items-center rounded-full text-ink-600 hover:bg-accent hover:text-danger-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Remove ${l.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="space-y-4 border-t bg-surface-alt/60 px-5 py-4">
              {quote ? (
                <>
                  <FreeDeliveryProgress totals={quote.totals} threshold={quote.freeDeliveryThreshold} />
                  <TotalsList totals={quote.totals} />
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-ink-600">
                  {loading && <Loader2 className="size-4 animate-spin" aria-hidden />} Checking prices…
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/basket"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-brand-900 font-semibold text-brand-900 hover:bg-white"
                >
                  View basket
                </Link>
                <Link
                  href="/checkout"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-cta font-semibold text-cta-foreground hover:bg-cta-hover"
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
