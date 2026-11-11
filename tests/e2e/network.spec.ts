// Acceptance #10: no runtime requests to third-party CDNs (Stripe's own checkout is the only exception).
import { expect, test } from '@playwright/test';
import { acceptCookies } from './helpers';

const ALLOWED = [/\.stripe\.com$/, /\.supabase\.co$/];

test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'runs once');

test('pages load only first-party assets', async ({ page, baseURL }) => {
  const own = new URL(baseURL!).host;
  const external = new Set<string>();
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (u.protocol.startsWith('http') && u.host !== own && !ALLOWED.some((re) => re.test(u.hostname)))
      external.add(u.host);
  });
  for (const path of ['/', '/shop', '/c/audio', '/basket', '/checkout', '/education']) {
    await page.goto(path);
    await acceptCookies(page);
    await page.waitForLoadState('networkidle');
  }
  await page.goto('/shop');
  await page.locator('a[href^="/p/"]').first().click();
  await page.waitForLoadState('networkidle');
  expect([...external]).toEqual([]);
});
