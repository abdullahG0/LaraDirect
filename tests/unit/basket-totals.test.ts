import { describe, expect, it } from 'vitest';
import { computeTotals } from '@/lib/basket/totals';
import { DEFAULT_SETTINGS, parseSettings } from '@/lib/settings';
import { checkoutDetailsSchema, normalisePostcode } from '@/lib/validation/checkout';

const settings = DEFAULT_SETTINGS; // £100 threshold, £4.99 / £9.99, TEACHER10

describe('computeTotals', () => {
  it('charges standard delivery under the threshold', () => {
    const t = computeTotals({ lines: [{ unitPriceIncVat: 30, quantity: 2 }], settings });
    expect(t.subtotal).toBe(60);
    expect(t.shipping).toBe(4.99);
    expect(t.total).toBe(64.99);
    expect(t.amountToFreeDelivery).toBe(40);
    expect(t.vat).toBeCloseTo(10.83, 2);
  });

  it('gives free standard delivery at the threshold, but still charges next day', () => {
    expect(computeTotals({ lines: [{ unitPriceIncVat: 100, quantity: 1 }], settings }).shipping).toBe(0);
    expect(
      computeTotals({ lines: [{ unitPriceIncVat: 100, quantity: 1 }], settings, deliveryMethod: 'next_day' })
        .shipping,
    ).toBe(9.99);
  });

  it('applies TEACHER10 and measures the threshold after discount', () => {
    const t = computeTotals({
      lines: [{ unitPriceIncVat: 105, quantity: 1 }],
      settings,
      promoCode: 'teacher10',
    });
    expect(t.discount).toBe(10.5);
    expect(t.promo?.applied).toBe(true);
    expect(t.freeDelivery).toBe(false); // 94.50 < 100
    expect(t.total).toBe(99.49);
  });

  it('rejects unknown and inactive codes', () => {
    expect(
      computeTotals({ lines: [{ unitPriceIncVat: 10, quantity: 1 }], settings, promoCode: 'NOPE' }).promo
        ?.applied,
    ).toBe(false);
    const s = { ...settings, promoCodes: [{ code: 'OLD', type: 'fixed' as const, value: 5, active: false }] };
    expect(
      computeTotals({ lines: [{ unitPriceIncVat: 10, quantity: 1 }], settings: s, promoCode: 'OLD' })
        .discount,
    ).toBe(0);
  });

  it('enforces minimum spend and caps fixed discounts at the subtotal', () => {
    const s = {
      ...settings,
      promoCodes: [{ code: 'BIG', type: 'fixed' as const, value: 50, active: true, minSpend: 20 }],
    };
    expect(
      computeTotals({ lines: [{ unitPriceIncVat: 10, quantity: 1 }], settings: s, promoCode: 'BIG' }).promo
        ?.applied,
    ).toBe(false);
    expect(
      computeTotals({ lines: [{ unitPriceIncVat: 30, quantity: 1 }], settings: s, promoCode: 'BIG' })
        .discount,
    ).toBe(30);
  });

  it('charges nothing for an empty basket', () => {
    expect(computeTotals({ lines: [], settings }).total).toBe(0);
  });
});

describe('parseSettings', () => {
  it('reads seeded JSON values and falls back to defaults', () => {
    const s = parseSettings([
      { key: 'vat_rate', value: '0.20' },
      { key: 'free_delivery_threshold', value: 150 },
      { key: 'shipping_rates', value: { standard: 3.5, next_day: 8 } },
    ]);
    expect(s.vatRate).toBe(0.2);
    expect(s.freeDeliveryThreshold).toBe(150);
    expect(s.shippingRates.standard).toBe(3.5);
    expect(s.promoCodes[0]?.code).toBe('TEACHER10');
  });
});

describe('checkout validation', () => {
  const valid = {
    email: 'teacher@school.sch.uk',
    fullName: 'Hannah Clarke',
    phone: '07700 900123',
    line1: '1 High Street',
    city: 'Leeds',
    postcode: 'ls62ab',
    deliveryMethod: 'standard',
    deliveringToSchool: false,
    acceptTerms: true,
  };

  it('accepts a valid UK address and normalises the postcode', () => {
    const r = checkoutDetailsSchema.parse(valid);
    expect(r.postcode).toBe('LS6 2AB');
  });

  it('rejects bad postcodes and emails with readable messages', () => {
    const r = checkoutDetailsSchema.safeParse({ ...valid, postcode: '12345', email: 'nope' });
    expect(r.success).toBe(false);
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message).join(' | ');
    expect(msgs).toMatch(/postcode/i);
    expect(msgs).toMatch(/email/i);
  });

  it('requires a school name when delivering to a school', () => {
    expect(checkoutDetailsSchema.safeParse({ ...valid, deliveringToSchool: true }).success).toBe(false);
    expect(
      checkoutDetailsSchema.safeParse({ ...valid, deliveringToSchool: true, schoolName: 'St Mary’s' })
        .success,
    ).toBe(true);
  });

  it('formats postcodes', () => {
    expect(normalisePostcode('sw1a1aa')).toBe('SW1A 1AA');
    expect(normalisePostcode('M1 1AE')).toBe('M1 1AE');
  });
});
