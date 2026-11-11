// Server-side basket re-pricing (step 4.1): the browser stores only product IDs and quantities
// that matter; prices, availability and totals always come from here.
import 'server-only';
import { getCatalogue } from '@/lib/catalogue/queries';
import type { StockStatus } from '@/lib/catalogue/types';
import { getStoreSettings } from '@/lib/settings-server';
import { computeTotals, type BasketTotals, type DeliveryMethod } from './totals';

export interface QuotedLine {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  unitPriceIncVat: number;
  quantity: number;
  stockStatus: StockStatus;
  maxQty: number;
  available: boolean;
  message: string | null;
}

export interface BasketQuote {
  lines: QuotedLine[];
  missing: string[]; // product IDs no longer on sale
  totals: BasketTotals;
  freeDeliveryThreshold: number;
}

export async function quoteBasket(input: {
  lines: { productId: string; quantity: number }[];
  promoCode?: string | null;
  deliveryMethod?: DeliveryMethod;
}): Promise<BasketQuote> {
  const [catalogue, settings] = await Promise.all([getCatalogue(), getStoreSettings()]);
  const byId = new Map(catalogue.map((p) => [p.id, p]));
  const missing: string[] = [];
  const lines: QuotedLine[] = [];

  for (const l of input.lines) {
    const p = byId.get(l.productId);
    if (!p) {
      missing.push(l.productId);
      continue;
    }
    const backorder = p.stockStatus === 'backorder';
    const maxQty = backorder ? 99 : Math.max(0, Math.min(99, p.stockQty));
    const available = p.stockStatus !== 'out_of_stock' && (backorder || maxQty > 0);
    let message: string | null = null;
    if (!available) message = 'Out of stock: remove to continue';
    else if (l.quantity > maxQty) message = `Only ${maxQty} available`;
    else if (backorder)
      message = p.eta
        ? `Pre-order: expected ${new Date(p.eta).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : 'Pre-order';
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      image: p.images[0] ?? null,
      unitPriceIncVat: p.priceIncVat,
      quantity: l.quantity,
      stockStatus: p.stockStatus,
      maxQty,
      available,
      message,
    });
  }

  const totals = computeTotals({
    lines: lines
      .filter((l) => l.available)
      .map((l) => ({ unitPriceIncVat: l.unitPriceIncVat, quantity: Math.min(l.quantity, l.maxQty) })),
    settings,
    promoCode: input.promoCode,
    deliveryMethod: input.deliveryMethod,
  });
  return { lines, missing, totals, freeDeliveryThreshold: settings.freeDeliveryThreshold };
}
