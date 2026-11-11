// Basket maths (step 4.1). Pure, so the basket page, checkout and POST /api/checkout all agree.
// Prices are inc VAT (UK consumer display); VAT is shown as the portion included.
import type { PromoCode, StoreSettings } from '@/lib/settings';
import { round2 } from '@/lib/utils/money';

export type DeliveryMethod = 'standard' | 'next_day';

export const DELIVERY_LABELS: Record<DeliveryMethod, { label: string; eta: string }> = {
  standard: { label: 'Standard delivery', eta: '2–4 working days' },
  next_day: { label: 'Next working day', eta: 'Order by 2pm, Mon–Fri' },
};

export interface TotalsLine {
  unitPriceIncVat: number;
  quantity: number;
}

export type TotalsSettings = Pick<
  StoreSettings,
  'vatRate' | 'freeDeliveryThreshold' | 'shippingRates' | 'promoCodes'
>;

export interface PromoResult {
  code: string;
  applied: boolean;
  message: string;
}

export interface BasketTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  promo: PromoResult | null;
  deliveryMethod: DeliveryMethod;
  shipping: number;
  freeDelivery: boolean;
  amountToFreeDelivery: number;
  total: number;
  vat: number;
  totalExVat: number;
  deliveryOptions: { id: DeliveryMethod; label: string; eta: string; price: number }[];
}

export function findPromo(codes: PromoCode[], code: string | null | undefined): PromoCode | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  return codes.find((p) => p.code.toUpperCase() === c && p.active) ?? null;
}

export function computeTotals(input: {
  lines: TotalsLine[];
  settings: TotalsSettings;
  promoCode?: string | null;
  deliveryMethod?: DeliveryMethod;
}): BasketTotals {
  const { settings } = input;
  const method: DeliveryMethod = input.deliveryMethod ?? 'standard';
  const subtotal = round2(input.lines.reduce((s, l) => s + l.unitPriceIncVat * l.quantity, 0));
  const itemCount = input.lines.reduce((n, l) => n + l.quantity, 0);

  let discount = 0;
  let promo: PromoResult | null = null;
  if (input.promoCode?.trim()) {
    const code = input.promoCode.trim().toUpperCase();
    const p = findPromo(settings.promoCodes, code);
    if (!p) promo = { code, applied: false, message: 'That code is not valid' };
    else if (p.minSpend && subtotal < p.minSpend) {
      promo = { code, applied: false, message: `Spend £${p.minSpend.toFixed(2)} or more to use this code` };
    } else {
      discount = round2(Math.min(subtotal, p.type === 'percent' ? (subtotal * p.value) / 100 : p.value));
      promo = {
        code,
        applied: true,
        message: p.type === 'percent' ? `${p.value}% off applied` : `£${p.value.toFixed(2)} off applied`,
      };
    }
  }

  const goods = round2(subtotal - discount);
  const freeDelivery = goods >= settings.freeDeliveryThreshold;
  const standardPrice = freeDelivery ? 0 : settings.shippingRates.standard;
  const deliveryOptions = [
    { id: 'standard' as const, ...DELIVERY_LABELS.standard, price: standardPrice },
    { id: 'next_day' as const, ...DELIVERY_LABELS.next_day, price: settings.shippingRates.next_day },
  ];
  const shipping =
    itemCount === 0 ? 0 : (deliveryOptions.find((o) => o.id === method)?.price ?? standardPrice);
  const total = round2(goods + shipping);
  const totalExVat = round2(total / (1 + settings.vatRate));

  return {
    itemCount,
    subtotal,
    discount,
    promo,
    deliveryMethod: method,
    shipping,
    freeDelivery,
    amountToFreeDelivery: round2(Math.max(0, settings.freeDeliveryThreshold - goods)),
    total,
    vat: round2(total - totalExVat),
    totalExVat,
    deliveryOptions,
  };
}
