// Step 9.2 / acceptance #6: cost price, margin and distributor SKUs never appear in any
// storefront page source or public API response.
import { expect, test } from '@playwright/test';
import { findLeaks } from './helpers';

test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'runs once');

test('storefront pages and public APIs leak no cost data', async ({ page, request }) => {
  const pages = ['/', '/shop', '/deals', '/search?q=headset', '/basket', '/checkout', '/education'];
  // Add every category page and a sample of product pages found on the listings.
  await page.goto('/shop');
  const productLinks = await page
    .locator('a[href^="/p/"]')
    .evaluateAll((as) =>
      [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!))].slice(0, 12),
    );
  const categoryLinks = await page
    .locator('a[href^="/c/"]')
    .evaluateAll((as) =>
      [...new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!.split('?')[0]!))].slice(0, 20),
    );
  const leaks: string[] = [];

  for (const path of [...pages, ...categoryLinks, ...productLinks]) {
    const res = await request.get(path);
    expect(res.status(), path).toBeLessThan(400);
    for (const l of findLeaks(await res.text())) leaks.push(`${path}: ${l}`);
  }

  const slug = productLinks[0]?.replace('/p/', '');
  const apis = [
    '/api/products',
    '/api/products?category=laptops&sort=price-asc',
    '/api/search/suggest?q=lenovo',
    ...(slug ? [`/api/products/${slug}`] : []),
  ];
  for (const path of apis) {
    const res = await request.get(path);
    expect(res.ok(), path).toBe(true);
    for (const l of findLeaks(await res.text())) leaks.push(`${path}: ${l}`);
  }

  // Basket quote is public too.
  const list = (await (await request.get('/api/products')).json()) as { items: { id: string }[] };
  const quote = await request.post('/api/basket', {
    data: { lines: list.items.slice(0, 3).map((i) => ({ productId: i.id, quantity: 1 })) },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(quote.ok()).toBe(true);
  for (const l of findLeaks(await quote.text())) leaks.push(`/api/basket: ${l}`);

  expect(leaks).toEqual([]);
});

test('order tracking API needs the right token', async ({ request }) => {
  const res = await request.get('/api/orders/LD-100001?token=wrong');
  expect(res.status()).toBe(404);
});
