'use client';

import { useState } from 'react';
import { Loader2, Tag, X } from 'lucide-react';
import type { BasketTotals } from '@/lib/basket/totals';
import { formatGBP } from '@/lib/utils/money';
import { useBasket } from './basket-provider';

export function FreeDeliveryProgress({ totals, threshold }: { totals: BasketTotals; threshold: number }) {
  const goods = totals.subtotal - totals.discount;
  const progress = Math.min(100, (goods / threshold) * 100);
  return (
    <div>
      <p className="text-sm text-ink-900" aria-live="polite">
        {totals.freeDelivery ? (
          <strong className="text-success-600">You’ve got free standard delivery</strong>
        ) : (
          <>
            Spend <strong className="tabular">{formatGBP(totals.amountToFreeDelivery)}</strong> more for free
            delivery
          </>
        )}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt"
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function TotalsList({
  totals,
  showDeliveryName = true,
}: {
  totals: BasketTotals;
  showDeliveryName?: boolean;
}) {
  const delivery = totals.deliveryOptions.find((o) => o.id === totals.deliveryMethod);
  return (
    <dl className="tabular space-y-2 text-sm" aria-live="polite">
      <div className="flex justify-between">
        <dt className="text-ink-600">Items ({totals.itemCount})</dt>
        <dd className="text-ink-900">{formatGBP(totals.subtotal)}</dd>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between text-success-600">
          <dt>Discount{totals.promo?.code ? ` (${totals.promo.code})` : ''}</dt>
          <dd>−{formatGBP(totals.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-ink-600">{showDeliveryName ? (delivery?.label ?? 'Delivery') : 'Delivery'}</dt>
        <dd className="text-ink-900">{totals.shipping === 0 ? 'Free' : formatGBP(totals.shipping)}</dd>
      </div>
      <div className="flex justify-between border-t pt-3 text-base font-bold text-brand-900">
        <dt>Total</dt>
        <dd>{formatGBP(totals.total)}</dd>
      </div>
      <div className="flex justify-between text-xs text-ink-600">
        <dt>Includes VAT of</dt>
        <dd>{formatGBP(totals.vat)}</dd>
      </div>
      <div className="flex justify-between text-xs text-ink-600">
        <dt>Total ex. VAT</dt>
        <dd>{formatGBP(totals.totalExVat)}</dd>
      </div>
    </dl>
  );
}

export function PromoCodeForm({ totals, loading }: { totals: BasketTotals | null; loading: boolean }) {
  const { promoCode, setPromoCode } = useBasket();
  const [value, setValue] = useState('');

  if (promoCode) {
    const invalid = totals?.promo && !totals.promo.applied;
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-surface-alt px-3 py-2 text-sm">
        <span className="flex items-center gap-2">
          <Tag className="size-4 text-brand-600" aria-hidden />
          <span className="font-semibold">{promoCode}</span>
          <span className={invalid ? 'text-danger-500' : 'text-success-600'}>
            {loading ? 'Checking…' : (totals?.promo?.message ?? '')}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setPromoCode('')}
          className="grid size-8 place-items-center rounded-full hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Remove promo code ${promoCode}`}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) setPromoCode(value);
        setValue('');
      }}
    >
      <label htmlFor="promo" className="sr-only">
        Promo code
      </label>
      <input
        id="promo"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Promo code"
        autoComplete="off"
        className="h-10 min-w-0 flex-1 rounded-full border border-input bg-white px-4 text-sm uppercase placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        className="h-10 rounded-full border border-brand-900 px-4 text-sm font-semibold text-brand-900 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-label="Checking" /> : 'Apply'}
      </button>
    </form>
  );
}
