// The seeded default rules from spec §7.2, mirrored from supabase/migrations/0002_seed_defaults.sql.
// Used by tests and by the catalogue margin report; the database is the source of truth at runtime.
import type { PricingRule } from './engine';

const rule = (
  id: string,
  scope: PricingRule['scope'],
  scopeValue: string | null,
  markupValue: number,
  minMarginPct: number,
): PricingRule => ({
  id,
  scope,
  scopeValue,
  markupType: 'percent',
  markupValue,
  minMarginPct,
  minMarginAmount: 0,
  rounding: 'x.99',
  priority: 0,
  isActive: true,
});

export const DEFAULT_RULES: PricingRule[] = [
  rule('global', 'global', null, 8, 3),
  rule('cat-laptops', 'category', 'Laptops', 5, 3),
  rule('cat-tablets', 'category', 'Tablets', 5, 3),
  rule('cat-desktops', 'category', 'Desktops & All-in-ones', 5, 3),
  rule('brand-apple', 'brand', 'Apple', 3, 2),
  rule('cat-monitors', 'category', 'Monitors & Displays', 10, 5),
  rule('cat-audio', 'category', 'Headphones & Audio', 18, 10),
  rule('cat-peripherals', 'category', 'Peripherals', 15, 8),
  rule('cat-networking', 'category', 'Networking & Power', 30, 15),
  rule('cat-accessories', 'category', 'Software & Accessories', 30, 15),
];
