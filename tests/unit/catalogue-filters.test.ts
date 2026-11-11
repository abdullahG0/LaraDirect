import { describe, expect, it } from 'vitest';
import { isDeal, listFromCatalogue, parseListParams, searchScore, withParams } from '@/lib/catalogue/filters';
import { keySpecLine, stockMessage } from '@/lib/catalogue/format';
import type { PublicProduct } from '@/lib/catalogue/types';

const product = (over: Partial<PublicProduct>): PublicProduct => ({
  id: over.slug ?? 'id',
  slug: 'p',
  brand: 'Lenovo',
  name: 'Lenovo Thing',
  description: '',
  category: 'Laptops',
  subcategory: 'Chromebooks',
  specs: {},
  images: [],
  tags: [],
  mpn: null,
  priceIncVat: 100,
  rrpIncVat: null,
  stockQty: 10,
  stockStatus: 'in_stock',
  eta: null,
  warrantyMonths: null,
  weightKg: null,
  featured: false,
  createdAt: '2026-11-01T00:00:00Z',
  ...over,
});

const catalogue: PublicProduct[] = [
  product({
    slug: 'cb-4',
    name: 'Lenovo EduBook Chromebook 4 GB',
    priceIncVat: 199.99,
    specs: { RAM: '4 GB', Screen: '11.6" HD', Storage: '32 GB eMMC', OS: 'ChromeOS' },
    tags: ['education', 'chromebook'],
  }),
  product({
    slug: 'cb-8',
    brand: 'Acer',
    name: 'Acer Chromebook 311 8 GB',
    priceIncVat: 271.99,
    rrpIncVat: 320,
    specs: { RAM: '8 GB', Screen: '11.6" HD touch', Storage: '64 GB eMMC', OS: 'ChromeOS' },
    tags: ['education'],
  }),
  product({
    slug: 'win-16',
    brand: 'Dell',
    name: 'Dell Latitude 3450 16 GB',
    subcategory: 'Windows laptops',
    priceIncVat: 977.99,
    specs: { RAM: '16 GB', Screen: '14" Full HD IPS', Storage: '256 GB SSD', OS: 'Windows 11 Pro Education' },
    stockStatus: 'out_of_stock',
    stockQty: 0,
  }),
  product({
    slug: 'headset',
    brand: 'Jabra',
    name: 'Jabra Evolve2 30 USB headset',
    category: 'Headphones & Audio',
    subcategory: 'Classroom headsets',
    priceIncVat: 39.99,
    specs: { Connection: 'USB-A', Wireless: 'No', Microphone: 'Boom mic' },
    tags: ['usb-headset'],
  }),
];

describe('parseListParams', () => {
  it('ignores malformed values instead of throwing', () => {
    const p = parseListParams({ page: '-3', min: 'abc', sort: 'bogus', stock: 'yes' });
    expect(p.page).toBe(1);
    expect(p.minPrice).toBeUndefined();
    expect(p.sort).toBe('recommended');
    expect(p.inStock).toBe(false);
  });

  it('reads multi-value filters and category facets', () => {
    const p = parseListParams(
      { brand: ['Acer', 'Lenovo'], ram: '8 GB', unknown: 'x' },
      { category: 'Laptops' },
    );
    expect(p.brands).toEqual(['Acer', 'Lenovo']);
    expect(p.facets).toEqual({ ram: ['8 GB'] });
  });
});

describe('listFromCatalogue', () => {
  it('filters by category and facet, and counts facets ignoring their own selection', () => {
    const params = parseListParams({ ram: '8 GB' }, { category: 'Laptops' });
    const r = listFromCatalogue(catalogue, params);
    expect(r.items.map((i) => i.slug)).toEqual(['cb-8']);
    const ram = r.facets.find((f) => f.key === 'ram')!;
    // All three laptop RAM sizes stay visible so the shopper can switch.
    expect(ram.options.map((o) => o.value)).toEqual(['4 GB', '8 GB', '16 GB']);
  });

  it('filters by price range and in-stock only', () => {
    const r = listFromCatalogue(catalogue, parseListParams({ min: '100', max: '1000', stock: '1' }));
    expect(r.items.map((i) => i.slug).sort()).toEqual(['cb-4', 'cb-8']);
  });

  it('sorts by price both ways', () => {
    const asc = listFromCatalogue(catalogue, parseListParams({ sort: 'price-asc' }));
    expect(asc.items.map((i) => i.priceIncVat)).toEqual([39.99, 199.99, 271.99, 977.99]);
    const desc = listFromCatalogue(catalogue, parseListParams({ sort: 'price-desc' }));
    expect(desc.items[0]!.priceIncVat).toBe(977.99);
  });

  it('puts out-of-stock products last in the recommended order', () => {
    const r = listFromCatalogue(catalogue, parseListParams({}, { category: 'Laptops' }));
    expect(r.items.at(-1)!.slug).toBe('win-16');
  });

  it('paginates and clamps an out-of-range page', () => {
    const params = { ...parseListParams({ page: '99' }), perPage: 3 };
    const r = listFromCatalogue(catalogue, params);
    expect(r.pageCount).toBe(2);
    expect(r.page).toBe(2);
    expect(r.items).toHaveLength(1);
  });

  it('never returns cost or margin fields', () => {
    const r = listFromCatalogue(catalogue, parseListParams({}));
    const keys = Object.keys(r.items[0]!);
    expect(keys.some((k) => /cost|margin|distributor/i.test(k))).toBe(false);
  });
});

describe('search', () => {
  it('matches plurals and requires every word', () => {
    const cb = catalogue[0]!;
    expect(searchScore(cb, 'chromebooks')).toBeGreaterThan(0);
    expect(searchScore(cb, 'lenovo chromebook')).toBeGreaterThan(0);
    expect(searchScore(cb, 'chromebook headset')).toBe(0);
  });

  it('ranks name matches above tag matches', () => {
    const r = listFromCatalogue(catalogue, parseListParams({ q: 'chromebook' }));
    expect(r.items.map((i) => i.slug)).toEqual(['cb-8', 'cb-4']);
  });
});

describe('display helpers', () => {
  it('treats only a 5%+ saving against RRP as a deal', () => {
    expect(isDeal({ priceIncVat: 100, rrpIncVat: 104 })).toBe(false);
    expect(isDeal({ priceIncVat: 100, rrpIncVat: 105 })).toBe(true);
    expect(isDeal({ priceIncVat: 100, rrpIncVat: null })).toBe(false);
  });

  it('builds a key spec line for laptops', () => {
    expect(keySpecLine(catalogue[0]!)).toBe('11.6" · 4 GB · 32 GB eMMC · ChromeOS');
  });

  it('describes stock in plain English', () => {
    expect(stockMessage({ stockStatus: 'low_stock', stockQty: 3, eta: null }).label).toBe('Only 3 left');
    expect(stockMessage({ stockStatus: 'out_of_stock', stockQty: 0, eta: null }).canBuy).toBe(false);
    expect(stockMessage({ stockStatus: 'backorder', stockQty: 0, eta: '2026-11-24' }).label).toBe(
      'Expected 24 Nov',
    );
  });

  it('withParams resets the page when filters change', () => {
    expect(withParams('/shop', { page: '3', brand: 'Acer' }, { brand: ['Acer', 'Dell'] })).toBe(
      '/shop?brand=Acer&brand=Dell',
    );
    expect(withParams('/shop', { brand: 'Acer' }, { page: '2' })).toBe('/shop?brand=Acer&page=2');
  });
});
