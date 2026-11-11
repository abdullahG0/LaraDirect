'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBasket } from 'lucide-react';
import { stockMessage } from '@/lib/catalogue/format';
import type { ProductSummary } from '@/lib/catalogue/types';
import { cn } from '@/lib/utils/cn';
import { useBasket } from './basket-provider';
import { Price, savingVsRrp } from './price';
import { StockBadge } from './stock-badge';

export function ProductCard({
  product: p,
  layout = 'grid',
  priority = false,
}: {
  product: ProductSummary;
  layout?: 'grid' | 'list';
  priority?: boolean;
}) {
  const { add, wishlist, toggleWishlist, ready } = useBasket();
  const saved = ready && wishlist.includes(p.id);
  const stock = stockMessage(p);
  const saving = savingVsRrp(p.priceIncVat, p.rrpIncVat);
  const list = layout === 'list';

  return (
    <article
      className={cn(
        'group relative flex h-full min-w-0 rounded-2xl border border-transparent bg-white p-3 shadow-card transition duration-200 focus-within:shadow-card-hover hover:-translate-y-0.5 hover:shadow-card-hover motion-reduce:transform-none',
        list ? 'flex-row gap-4 sm:gap-6' : 'flex-col',
      )}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-xl bg-surface-alt',
          list ? 'aspect-square w-28 sm:w-44' : 'aspect-square w-full',
        )}
      >
        {p.images[0] && (
          <Image
            src={p.images[0]}
            alt=""
            fill
            priority={priority}
            sizes={list ? '176px' : '(min-width: 1280px) 300px, (min-width: 768px) 33vw, 50vw'}
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        )}
        {saving !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-cta px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cta-foreground">
            Save £{saving}
          </span>
        )}
        <button
          type="button"
          onClick={() => toggleWishlist(p.id, p.name)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
          className="absolute right-2 top-2 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-ink-600 shadow-sm hover:text-danger-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart className={cn('size-[18px]', saved && 'fill-danger-500 text-danger-500')} aria-hidden />
        </button>
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col', list ? 'py-1' : 'px-1 pb-1 pt-3')}>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{p.brand}</p>
        <h3 className="mt-0.5 font-heading text-[17px] font-semibold leading-snug text-brand-900">
          {/* The whole card is clickable via this link's ::after overlay. */}
          <Link
            href={`/p/${p.slug}`}
            className="line-clamp-2 after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {p.name.replace(new RegExp(`^${p.brand}\\s+`), '')}
          </Link>
        </h3>
        {p.keySpecs && <p className="mt-1 line-clamp-1 text-[13px] text-ink-600">{p.keySpecs}</p>}
        <StockBadge {...p} className="mt-2" />

        <div
          className={cn(
            'mt-auto flex flex-col gap-2.5 pt-3',
            list && 'sm:flex-row sm:items-end sm:justify-between sm:pt-4',
          )}
        >
          <Price priceIncVat={p.priceIncVat} rrpIncVat={p.rrpIncVat} />
          <button
            type="button"
            disabled={!stock.canBuy}
            onClick={() => add(p)}
            className={cn(
              'relative z-10 inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-cta px-4 text-sm font-semibold text-cta-foreground transition hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-400 motion-reduce:transform-none',
              list && 'sm:w-auto',
            )}
          >
            <ShoppingBasket className="size-4" aria-hidden />
            <span className="whitespace-nowrap">
              {stock.canBuy ? (
                <>
                  Add<span className="hidden min-[400px]:inline sm:inline"> to basket</span>
                </>
              ) : (
                'Out of stock'
              )}
            </span>
            <span className="sr-only">: {p.name}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
