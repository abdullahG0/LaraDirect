// Store settings (spec §6 `settings` table, §11.1 Settings page). The parsing is pure so the
// basket, checkout and admin pages agree on defaults even before the table is filled in.
import type { Db } from '@/lib/supabase/db';
import { STORE } from '@/lib/store-config';

export interface PromoCode {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
  minSpend?: number;
}

export interface EmailTemplateSetting {
  subject: string;
}

export interface StoreSettings {
  vatRate: number;
  freeDeliveryThreshold: number;
  shippingRates: { standard: number; next_day: number };
  promoCodes: PromoCode[];
  company: { name: string; number: string; vat: string; address?: string; email?: string; phone?: string };
  featureFlags: { demo_banner: boolean; blind_shipment: boolean; hold_below_floor: boolean };
  emailTemplates: Record<string, EmailTemplateSetting>;
  mockControls: { fail_rate: number | null; reject_skus: string[] };
  syncIntervalMinutes: number;
}

export const SETTING_KEYS = [
  'vat_rate',
  'free_delivery_threshold',
  'shipping_rates',
  'promo_codes',
  'company',
  'feature_flags',
  'email_templates',
  'mock_controls',
  'sync_interval_minutes',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const DEFAULT_SETTINGS: StoreSettings = {
  vatRate: 0.2,
  freeDeliveryThreshold: STORE.freeDeliveryThreshold,
  shippingRates: { standard: STORE.standardDelivery, next_day: STORE.nextDayDelivery },
  promoCodes: [{ code: 'TEACHER10', type: 'percent', value: 10, active: true }],
  company: {
    name: STORE.company.legalName,
    number: STORE.company.number,
    vat: STORE.company.vat,
    address: STORE.company.address,
    email: STORE.email,
    phone: STORE.phone,
  },
  featureFlags: { demo_banner: true, blind_shipment: true, hold_below_floor: false },
  emailTemplates: {
    order_confirmation: { subject: 'Thanks for your order {{orderNumber}}' },
    order_dispatched: { subject: 'Your order {{orderNumber}} is on its way' },
    order_delivered: { subject: 'Your order {{orderNumber}} has been delivered' },
    order_problem: { subject: 'An update on your order {{orderNumber}}' },
  },
  mockControls: { fail_rate: null, reject_skus: [] },
  syncIntervalMinutes: 15,
};

const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const obj = <T>(v: unknown, fallback: T): T =>
  v && typeof v === 'object' && !Array.isArray(v) ? { ...fallback, ...(v as object) } : fallback;

export function parseSettings(rows: { key: string; value: unknown }[]): StoreSettings {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const d = DEFAULT_SETTINGS;
  const promos = m.get('promo_codes');
  const rates = obj(m.get('shipping_rates'), d.shippingRates);
  const mock = obj(m.get('mock_controls'), d.mockControls);
  return {
    vatRate: num(m.get('vat_rate'), d.vatRate),
    freeDeliveryThreshold: num(m.get('free_delivery_threshold'), d.freeDeliveryThreshold),
    shippingRates: { standard: num(rates.standard, 4.99), next_day: num(rates.next_day, 9.99) },
    promoCodes: Array.isArray(promos)
      ? (promos as PromoCode[]).map((p) => ({
          ...p,
          code: String(p.code).toUpperCase(),
          value: num(p.value, 0),
        }))
      : d.promoCodes,
    company: obj(m.get('company'), d.company),
    featureFlags: obj(m.get('feature_flags'), d.featureFlags),
    emailTemplates: obj(m.get('email_templates'), d.emailTemplates),
    mockControls: {
      fail_rate: mock.fail_rate === null || mock.fail_rate === undefined ? null : num(mock.fail_rate, 0),
      reject_skus: Array.isArray(mock.reject_skus) ? mock.reject_skus.map(String) : [],
    },
    syncIntervalMinutes: num(m.get('sync_interval_minutes'), d.syncIntervalMinutes),
  };
}

export async function getSettings(db: Db): Promise<StoreSettings> {
  const { data, error } = await db.from('settings').select('key, value');
  if (error) {
    console.warn(`settings: falling back to defaults (${error.message})`);
    return DEFAULT_SETTINGS;
  }
  return parseSettings(data);
}

/** Maps a StoreSettings field back to its database key and JSON value. */
export function settingValue(key: SettingKey, s: StoreSettings): unknown {
  switch (key) {
    case 'vat_rate':
      return s.vatRate;
    case 'free_delivery_threshold':
      return s.freeDeliveryThreshold;
    case 'shipping_rates':
      return s.shippingRates;
    case 'promo_codes':
      return s.promoCodes;
    case 'company':
      return s.company;
    case 'feature_flags':
      return s.featureFlags;
    case 'email_templates':
      return s.emailTemplates;
    case 'mock_controls':
      return s.mockControls;
    case 'sync_interval_minutes':
      return s.syncIntervalMinutes;
  }
}
