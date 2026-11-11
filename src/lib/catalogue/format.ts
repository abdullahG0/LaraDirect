// Display helpers for storefront products. Client-safe.
import type { PublicProduct, StockStatus } from './types';

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

/** One-line spec summary for product cards, e.g. `14" · 8 GB · 256 GB SSD`. */
export function keySpecLine(p: Pick<PublicProduct, 'category' | 'specs'>): string {
  const s = p.specs;
  const screen = (v?: string) => v?.match(/^[\d.]+"/)?.[0];
  const parts: (string | undefined)[] = (() => {
    switch (p.category) {
      case 'Laptops':
        return [screen(s.Screen), s.RAM, s.Storage, s.OS];
      case 'Tablets':
        return s.Screen
          ? [screen(s.Screen), s.Storage, s.Connectivity]
          : [s.Compatibility, s.Protection ?? s.Layout];
      case 'Desktops & All-in-ones':
        return [s.Processor?.replace(/, \d+-core CPU/, ''), s.RAM, s.Storage];
      case 'Monitors & Displays':
        return [s.Size, s.Resolution?.replace(/ \d+×\d+/, ''), s.Panel ?? s.Touch];
      case 'Headphones & Audio':
        return [s.Type?.split(',')[0], s.Connection?.split(' with ')[0], s.Microphone ? 'Mic' : undefined];
      case 'Peripherals':
        return [s.Connection, s.Resolution ?? s.Sensor ?? s.Layout ?? s.Range];
      default:
        return Object.values(s).slice(0, 2);
    }
  })();
  return parts.filter(Boolean).slice(0, 4).join(' · ');
}

export interface StockMessage {
  label: string; // short badge text
  detail: string; // sentence for the product page
  tone: 'success' | 'warn' | 'danger' | 'info';
  canBuy: boolean;
}

export function stockMessage(p: {
  stockStatus: StockStatus;
  stockQty: number;
  eta: string | null;
}): StockMessage {
  switch (p.stockStatus) {
    case 'in_stock':
      return {
        label: 'In stock',
        detail: 'In stock: dispatched within 1–2 working days',
        tone: 'success',
        canBuy: true,
      };
    case 'low_stock':
      return {
        label: `Only ${p.stockQty} left`,
        detail: `Only ${p.stockQty} left in stock: dispatched within 1–2 working days`,
        tone: 'warn',
        canBuy: true,
      };
    case 'backorder': {
      const when = p.eta ? shortDate.format(new Date(p.eta)) : null;
      return {
        label: when ? `Expected ${when}` : 'On order',
        detail: when ? `Available to order: expected in stock ${when}` : 'Available to order: awaiting stock',
        tone: 'info',
        canBuy: true,
      };
    }
    case 'out_of_stock':
      return {
        label: 'Out of stock',
        detail: 'Out of stock: check back soon',
        tone: 'danger',
        canBuy: false,
      };
    case 'discontinued':
    default:
      return { label: 'Discontinued', detail: 'No longer available', tone: 'danger', canBuy: false };
  }
}

export const exVatPrice = (incVat: number, vatRate = 0.2) => Math.round((incVat / (1 + vatRate)) * 100) / 100;
