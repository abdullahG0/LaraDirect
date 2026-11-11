'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Minus, Plus, ShoppingBasket } from 'lucide-react';
import { toast } from 'sonner';
import { exVatPrice, stockMessage } from '@/lib/catalogue/format';
import { isDeal } from '@/lib/catalogue/filters';
import type { PublicProduct } from '@/lib/catalogue/types';
import { formatGBP } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { useBasket } from '../basket-provider';
import { StockBadge } from '../stock-badge';

type Props = Pick<
  PublicProduct,
  | 'id'
  | 'slug'
  | 'name'
  | 'brand'
  | 'images'
  | 'priceIncVat'
  | 'rrpIncVat'
  | 'stockStatus'
  | 'stockQty'
  | 'eta'
>;

const VAT_KEY = 'ld-show-ex-vat';

export function PurchasePanel({ product: p }: { product: Props }) {
  const { add } = useBasket();
  const [qty, setQty] = useState(1);
  const [exVat, setExVat] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const stock = stockMessage(p);
  const maxQty = p.stockStatus === 'low_stock' ? Math.max(1, p.stockQty) : 99;

  // Schools usually think in ex-VAT prices, so remember the choice across pages.
  useEffect(() => {
    try {
      setExVat(window.localStorage.getItem(VAT_KEY) === '1');
    } catch {
      // ignore
    }
  }, []);
  const toggleVat = (v: boolean) => {
    setExVat(v);
    try {
      window.localStorage.setItem(VAT_KEY, v ? '1' : '0');
    } catch {
      // ignore
    }
  };

  // Mobile sticky bar appears once the main Add to basket button scrolls out of view.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry!.isIntersecting), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const unit = exVat ? exVatPrice(p.priceIncVat) : p.priceIncVat;
  const deal = isDeal(p);
  const rrp = p.rrpIncVat ? (exVat ? exVatPrice(p.rrpIncVat) : p.rrpIncVat) : null;

  const addToBasket = () => add({ ...p }, qty);

  return (
    <>
      <div className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div
            className="inline-flex rounded-lg border bg-surface-alt p-0.5 text-xs font-semibold"
            role="group"
            aria-label="Show prices"
          >
            {[
              { v: false, label: 'Inc. VAT' },
              { v: true, label: 'Ex. VAT' },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={exVat === o.v}
                onClick={() => toggleVat(o.v)}
                className={cn(
                  'rounded-md px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  exVat === o.v ? 'bg-white text-brand-900 shadow-sm' : 'text-ink-600',
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {deal && (
            <span className="rounded-full bg-cta px-3 py-1 text-xs font-bold uppercase tracking-wide text-cta-foreground">
              Save £{Math.floor(p.rrpIncVat! - p.priceIncVat)}
            </span>
          )}
        </div>

        <div className="tabular mt-4">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-heading text-4xl font-bold text-brand-900">{formatGBP(unit)}</span>
            {deal && rrp && (
              <span className="text-base text-ink-600">
                RRP <s>{formatGBP(rrp)}</s>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-600">
            {exVat
              ? `${formatGBP(p.priceIncVat)} including VAT`
              : `${formatGBP(exVatPrice(p.priceIncVat))} excluding VAT`}
          </p>
        </div>

        <StockBadge {...p} detailed className="mt-4" />

        <div ref={panelRef} className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center rounded-full border bg-white">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="grid size-12 place-items-center rounded-full text-brand-900 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-ink-400"
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <label htmlFor="qty" className="sr-only">
              Quantity
            </label>
            <input
              id="qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
              className="tabular w-10 bg-transparent text-center text-base font-semibold text-brand-900 [appearance:textfield] focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="grid size-12 place-items-center rounded-full text-brand-900 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-ink-400"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={addToBasket}
            disabled={!stock.canBuy}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-cta px-6 text-base font-semibold text-cta-foreground transition hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-400 motion-reduce:transform-none"
          >
            <ShoppingBasket className="size-5" aria-hidden />
            {stock.canBuy ? 'Add to basket' : 'Out of stock'}
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            toast.success('Added to your quote request', {
              description: `${qty} × ${p.name}. Demo: our schools team would follow up within one working day.`,
            })
          }
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-brand-900 text-sm font-semibold text-brand-900 hover:bg-brand-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <FileText className="size-4" aria-hidden />
          Add to quote (bulk and school orders)
        </button>
      </div>

      {/* Sticky add-to-basket bar on mobile (spec §10.3). */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(14,30,62,0.08)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden',
          stickyVisible ? 'translate-y-0' : 'translate-y-full',
        )}
        aria-hidden={!stickyVisible}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
            <p className="tabular font-heading text-lg font-bold text-brand-900">{formatGBP(unit)}</p>
          </div>
          <button
            type="button"
            onClick={addToBasket}
            disabled={!stock.canBuy}
            tabIndex={stickyVisible ? 0 : -1}
            className="h-11 shrink-0 rounded-full bg-cta px-5 text-sm font-semibold text-cta-foreground disabled:bg-muted disabled:text-ink-400"
          >
            {stock.canBuy ? 'Add to basket' : 'Out of stock'}
          </button>
        </div>
      </div>
    </>
  );
}
