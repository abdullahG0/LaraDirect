import { describe, expect, it } from 'vitest';
import catalogue from '@data/mock-catalogue.json';
import {
  applyRounding,
  calculatePrice,
  previewImpact,
  selectRule,
  type PriceInput,
  type PricingRule,
} from '@/lib/pricing/engine';
import { DEFAULT_RULES } from '@/lib/pricing/default-rules';
import { pricingRuleInputSchema, ruleFromRow } from '@/lib/validation/pricing';
import type { MockCatalogueItem } from '@/lib/distributor/mock/catalogue-types';

const VAT = 0.2;
const items = catalogue as unknown as MockCatalogueItem[];

const laptop = (cost: number, extra: Partial<PriceInput> = {}): PriceInput => ({
  sku: 'TDS-LEN-1',
  brand: 'Lenovo',
  category: 'Laptops',
  costPriceExVat: cost,
  ...extra,
});

const rule = (over: Partial<PricingRule>): PricingRule => ({
  id: over.id ?? 'r',
  scope: 'global',
  scopeValue: null,
  markupType: 'percent',
  markupValue: 10,
  minMarginPct: 0,
  minMarginAmount: 0,
  rounding: 'x.99',
  priority: 0,
  isActive: true,
  ...over,
});

describe('selectRule', () => {
  it('prefers sku > brand > category > global', () => {
    const rules = [
      rule({ id: 'g' }),
      rule({ id: 'c', scope: 'category', scopeValue: 'Laptops' }),
      rule({ id: 'b', scope: 'brand', scopeValue: 'Lenovo' }),
      rule({ id: 's', scope: 'sku', scopeValue: 'TDS-LEN-1' }),
    ];
    expect(selectRule(laptop(100), rules)?.id).toBe('s');
    expect(selectRule(laptop(100), rules.slice(0, 3))?.id).toBe('b');
    expect(selectRule(laptop(100), rules.slice(0, 2))?.id).toBe('c');
    expect(selectRule(laptop(100), rules.slice(0, 1))?.id).toBe('g');
  });

  it('Apple brand rule beats the Laptops category rule', () => {
    expect(selectRule(laptop(1000, { brand: 'Apple' }), DEFAULT_RULES)?.id).toBe('brand-apple');
  });

  it('uses priority to break ties at the same scope, and ignores inactive rules', () => {
    const rules = [
      rule({ id: 'low', scope: 'category', scopeValue: 'Laptops', priority: 0 }),
      rule({ id: 'high', scope: 'category', scopeValue: 'Laptops', priority: 5 }),
      rule({ id: 'off', scope: 'category', scopeValue: 'Laptops', priority: 9, isActive: false }),
    ];
    expect(selectRule(laptop(100), rules)?.id).toBe('high');
  });

  it('matches scope values case-insensitively', () => {
    expect(selectRule(laptop(100), [rule({ id: 'b', scope: 'brand', scopeValue: ' lenovo ' })])?.id).toBe(
      'b',
    );
  });
});

describe('applyRounding', () => {
  it('x.99 picks the nearest .99 price', () => {
    expect(applyRounding(630.0, 'x.99')).toBe(629.99);
    expect(applyRounding(12.99, 'x.99')).toBe(12.99);
    expect(applyRounding(12.4, 'x.99')).toBe(11.99);
    expect(applyRounding(12.6, 'x.99')).toBe(12.99);
  });

  it('never rounds below the minimum', () => {
    expect(applyRounding(13.0, 'x.99', 13.0)).toBe(13.99);
    expect(applyRounding(12.5, 'nearest_1', 12.2)).toBe(13);
    expect(applyRounding(12.001, 'none', 12.01)).toBe(12.01);
  });

  it('x.95 and nearest_1', () => {
    expect(applyRounding(12.5, 'x.95')).toBe(12.95);
    expect(applyRounding(12.2, 'x.95')).toBe(11.95);
    expect(applyRounding(12.49, 'nearest_1')).toBe(12);
    expect(applyRounding(12.5, 'nearest_1')).toBe(13);
  });

  it('none rounds to pennies', () => {
    expect(applyRounding(12.345, 'none')).toBe(12.35);
  });
});

describe('calculatePrice', () => {
  it('applies markup, VAT and x.99 rounding, with margin on the ex-VAT price', () => {
    const r = calculatePrice(laptop(500), DEFAULT_RULES, VAT);
    expect(r.ruleId).toBe('cat-laptops');
    expect(r.sellPriceIncVat).toBe(629.99);
    expect(r.sellPriceExVat).toBe(524.99);
    expect(r.marginPct).toBeCloseTo(4.76, 2);
    expect(r.marginStatus).toBe('ok');
    expect(r.steps.at(-1)).toEqual({ label: 'Final price (inc VAT)', value: 629.99 });
  });

  it('VAT never counts as profit', () => {
    const r = calculatePrice(laptop(500), DEFAULT_RULES, VAT);
    expect(r.marginAmount).toBeCloseTo(r.sellPriceIncVat / 1.2 - 500, 1);
  });

  it('raises the price to the margin floor when the markup is too thin', () => {
    const rules = [rule({ scope: 'sku', scopeValue: 'TDS-LEN-1', markupValue: 1, minMarginPct: 3 })];
    const r = calculatePrice(laptop(200), rules, VAT);
    expect(r.steps.some((s) => s.label.startsWith('Raised to margin floor'))).toBe(true);
    expect(r.sellPriceIncVat).toBe(247.99);
    expect(r.marginPct).toBeGreaterThanOrEqual(3);
    expect(r.belowFloor).toBe(false);
  });

  it('a price exactly at the floor reads as that margin, not below it', () => {
    const rules = [rule({ markupValue: 0, minMarginPct: 3, rounding: 'none' })];
    const r = calculatePrice(laptop(97), rules, VAT);
    expect(r.sellPriceExVat).toBe(100);
    expect(r.marginPct).toBe(3);
    expect(r.marginStatus).toBe('ok');
  });

  it('honours a fixed GBP minimum margin', () => {
    const rules = [rule({ markupValue: 5, minMarginAmount: 3 })];
    const r = calculatePrice(laptop(10), rules, VAT);
    expect(r.sellPriceIncVat).toBe(15.99);
    expect(r.marginAmount).toBeGreaterThanOrEqual(3);
  });

  it('supports fixed markups', () => {
    const r = calculatePrice(
      laptop(10),
      [rule({ markupType: 'fixed', markupValue: 5, rounding: 'none' })],
      VAT,
    );
    expect(r.sellPriceIncVat).toBe(18);
    expect(r.sellPriceExVat).toBe(15);
  });

  it('uses a manual override but flags it when below the floor', () => {
    const below = calculatePrice(laptop(100, { priceOverrideIncVat: 121 }), DEFAULT_RULES, VAT);
    expect(below.overridden).toBe(true);
    expect(below.sellPriceIncVat).toBe(121);
    expect(below.marginStatus).toBe('below_floor');

    const negative = calculatePrice(laptop(100, { priceOverrideIncVat: 110 }), DEFAULT_RULES, VAT);
    expect(negative.marginStatus).toBe('negative');

    const fine = calculatePrice(laptop(100, { priceOverrideIncVat: 149.99 }), DEFAULT_RULES, VAT);
    expect(fine.marginStatus).toBe('ok');
  });

  it('sells at cost when no rule matches', () => {
    const r = calculatePrice(laptop(10), [], VAT);
    expect(r.ruleId).toBeNull();
    expect(r.sellPriceIncVat).toBe(12);
    expect(r.marginPct).toBe(0);
  });
});

describe('default rules across the mock catalogue', () => {
  const priced = items.map((p) => ({ p, r: calculatePrice(p, DEFAULT_RULES, VAT) }));

  it('prices every product at or above its floor, ending in .99', () => {
    for (const { p, r } of priced) {
      expect(r.marginStatus, p.sku).toBe('ok');
      expect(Math.round(r.sellPriceIncVat * 100) % 100, p.sku).toBe(99);
    }
  });

  it('lands margins in realistic bands (spec §5.4)', () => {
    const avg = (cat: string, brand?: string) => {
      const xs = priced.filter(({ p }) => p.category === cat && (!brand || p.brand === brand));
      return xs.reduce((s, { r }) => s + r.marginPct, 0) / xs.length;
    };
    expect(avg('Laptops')).toBeGreaterThan(2.5);
    expect(avg('Laptops')).toBeLessThan(6);
    expect(avg('Monitors & Displays')).toBeGreaterThan(7);
    expect(avg('Headphones & Audio')).toBeGreaterThan(13);
    expect(avg('Software & Accessories')).toBeGreaterThan(20);
  });
});

describe('previewImpact', () => {
  it('reports affected products and margin change for a raised Laptops markup', () => {
    const products = items.map((p) => ({ ...p, id: p.sku }));
    const proposed = DEFAULT_RULES.map((r) => (r.id === 'cat-laptops' ? { ...r, markupValue: 8 } : r));
    const impact = previewImpact(products, DEFAULT_RULES, proposed, VAT);
    const nonAppleLaptops = items.filter((p) => p.category === 'Laptops' && p.brand !== 'Apple').length;
    expect(impact.productsAffected).toBe(nonAppleLaptops);
    expect(impact.avgMarginAfter).toBeGreaterThan(impact.avgMarginBefore);
    expect(impact.biggestChanges).toHaveLength(10);
    const [first, second] = impact.biggestChanges;
    expect(Math.abs(first!.after - first!.before)).toBeGreaterThanOrEqual(
      Math.abs(second!.after - second!.before),
    );
  });
});

describe('pricing rule validation', () => {
  it('requires a scope value except for global rules', () => {
    expect(
      pricingRuleInputSchema.safeParse({ scope: 'category', markupType: 'percent', markupValue: 5 }).success,
    ).toBe(false);
    expect(
      pricingRuleInputSchema.safeParse({
        scope: 'global',
        scopeValue: 'x',
        markupType: 'percent',
        markupValue: 5,
      }).success,
    ).toBe(false);
    const ok = pricingRuleInputSchema.parse({
      scope: 'brand',
      scopeValue: 'Apple',
      markupType: 'percent',
      markupValue: '3',
    });
    expect(ok).toMatchObject({ markupValue: 3, rounding: 'x.99', isActive: true, minMarginPct: 0 });
  });

  it('maps database rows with string numerics', () => {
    const r = ruleFromRow({
      id: '1',
      scope: 'category',
      scope_value: 'Laptops',
      markup_type: 'percent',
      markup_value: '5.00',
      min_margin_pct: '3.00',
      min_margin_amount: null,
      rounding: 'x.99',
      priority: 0,
      is_active: true,
    });
    expect(r).toMatchObject({ markupValue: 5, minMarginPct: 3, minMarginAmount: 0 });
  });
});
