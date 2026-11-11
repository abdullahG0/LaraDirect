'use client';

// Basket and wishlist, kept in localStorage (step 4.1). Prices stored here are display hints
// only: useBasketQuote() re-prices every line on the server, and checkout re-prices again.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ProductSummary } from '@/lib/catalogue/types';
import type { BasketQuote } from '@/lib/basket/quote';
import type { DeliveryMethod } from '@/lib/basket/totals';

export interface BasketLine {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  priceIncVat: number;
  quantity: number;
}

interface BasketContextValue {
  lines: BasketLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (
    p: Pick<ProductSummary, 'id' | 'slug' | 'name' | 'brand' | 'images' | 'priceIncVat'>,
    qty?: number,
  ) => void;
  setQuantity: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  promoCode: string;
  setPromoCode: (code: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Updates display prices from a server quote and drops products no longer on sale. */
  applyQuote: (quote: BasketQuote) => void;
  wishlist: string[];
  toggleWishlist: (productId: string, name: string) => void;
}

const BasketContext = createContext<BasketContextValue | null>(null);

const BASKET_KEY = 'ld-basket-v1';
const WISHLIST_KEY = 'ld-wishlist-v1';
const PROMO_KEY = 'ld-promo-v1';
const MAX_QTY = 99;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage blocked: the basket still works for this page view.
  }
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [promoCode, setPromoCodeState] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(load<BasketLine[]>(BASKET_KEY, []));
    setWishlist(load<string[]>(WISHLIST_KEY, []));
    setPromoCodeState(load<string>(PROMO_KEY, ''));
    setReady(true);
    // Keep tabs in step: a change in one tab updates the others.
    const onStorage = (e: StorageEvent) => {
      if (e.key === BASKET_KEY) setLines(load<BasketLine[]>(BASKET_KEY, []));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (ready) save(BASKET_KEY, lines);
  }, [lines, ready]);
  useEffect(() => {
    if (ready) save(WISHLIST_KEY, wishlist);
  }, [wishlist, ready]);
  useEffect(() => {
    if (ready) save(PROMO_KEY, promoCode);
  }, [promoCode, ready]);

  const add = useCallback<BasketContextValue['add']>((p, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + qty) } : l,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          slug: p.slug,
          name: p.name,
          brand: p.brand,
          image: p.images[0] ?? null,
          priceIncVat: p.priceIncVat,
          quantity: Math.min(MAX_QTY, qty),
        },
      ];
    });
    setDrawerOpen(true);
  }, []);

  const setQuantity = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, qty) } : l)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setPromoCodeState('');
  }, []);

  const setPromoCode = useCallback((code: string) => setPromoCodeState(code.trim().toUpperCase()), []);

  const applyQuote = useCallback((quote: BasketQuote) => {
    const byId = new Map(quote.lines.map((l) => [l.productId, l]));
    setLines((prev) => {
      let changed = false;
      const next = prev.flatMap((l) => {
        if (quote.missing.includes(l.productId)) {
          changed = true;
          toast(`${l.name} is no longer available and was removed from your basket`);
          return [];
        }
        const q = byId.get(l.productId);
        if (q && (q.unitPriceIncVat !== l.priceIncVat || q.name !== l.name || q.image !== l.image)) {
          changed = true;
          return [{ ...l, priceIncVat: q.unitPriceIncVat, name: q.name, image: q.image }];
        }
        return [l];
      });
      return changed ? next : prev;
    });
  }, []);

  const toggleWishlist = useCallback((productId: string, name: string) => {
    setWishlist((prev) => {
      const has = prev.includes(productId);
      toast(has ? 'Removed from wishlist' : 'Saved to wishlist', { description: name });
      return has ? prev.filter((id) => id !== productId) : [...prev, productId];
    });
  }, []);

  const value = useMemo<BasketContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: Math.round(lines.reduce((s, l) => s + l.priceIncVat * l.quantity, 0) * 100) / 100,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      promoCode,
      setPromoCode,
      drawerOpen,
      setDrawerOpen,
      applyQuote,
      wishlist,
      toggleWishlist,
    }),
    [
      lines,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      promoCode,
      setPromoCode,
      drawerOpen,
      applyQuote,
      wishlist,
      toggleWishlist,
    ],
  );

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useBasket must be used inside <BasketProvider>');
  return ctx;
}

/**
 * Server-priced view of the basket (POST /api/basket), refreshed when lines, promo code or
 * delivery method change. Debounced so quantity clicks don't flood the server.
 */
export function useBasketQuote(deliveryMethod: DeliveryMethod = 'standard', enabled = true) {
  const { lines, promoCode, ready, applyQuote } = useBasket();
  const [quote, setQuote] = useState<BasketQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const key = JSON.stringify([lines.map((l) => [l.productId, l.quantity]), promoCode, deliveryMethod]);

  useEffect(() => {
    if (!ready || !enabled) return;
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/basket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
            promoCode: promoCode || null,
            deliveryMethod,
          }),
        });
        const json = await res.json();
        if (id !== seq.current) return;
        if (!res.ok) throw new Error(json?.error?.message ?? 'Could not price your basket');
        setQuote(json as BasketQuote);
        setError(null);
        applyQuote(json as BasketQuote);
      } catch (err) {
        if (id === seq.current) setError((err as Error).message);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready, enabled]);

  return { quote, loading, error };
}
