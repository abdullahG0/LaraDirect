'use client';

import Link from 'next/link';
import { ShoppingBasket } from 'lucide-react';
import { formatGBP } from '@/lib/utils/money';
import { useBasket } from './basket-provider';

export function BasketButton() {
  const { count, subtotal, ready, setDrawerOpen } = useBasket();
  return (
    <Link
      href="/basket"
      onClick={(e) => {
        // Plain clicks open the mini basket; new-tab clicks still go to /basket.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        setDrawerOpen(true);
      }}
      aria-haspopup="dialog"
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-brand-900 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative">
        <ShoppingBasket className="size-7 text-brand-600" aria-hidden />
        {ready && count > 0 && (
          <span className="absolute -right-2 -top-1.5 grid min-w-5 place-items-center rounded-full bg-cta px-1 text-[11px] font-bold leading-5 text-cta-foreground">
            {count}
          </span>
        )}
      </span>
      <span className="hidden text-left leading-tight sm:block">
        <span className="block text-sm text-ink-600">Basket</span>
        <span className="tabular block text-[15px] font-bold">{formatGBP(ready ? subtotal : 0)}</span>
      </span>
      {/* Announced to screen readers when the basket changes (spec §10.6 aria-live). */}
      <span className="sr-only" aria-live="polite">
        {ready ? `${count} ${count === 1 ? 'item' : 'items'} in basket` : ''}
      </span>
    </Link>
  );
}
