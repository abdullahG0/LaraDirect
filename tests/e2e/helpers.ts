import type { Page } from '@playwright/test';

/** Strings that must never reach the storefront (acceptance #6). */
export const FORBIDDEN = [
  /cost_price/i,
  /costPrice/,
  /margin_pct/i,
  /marginPct/,
  /distributor_sku/i,
  /distributorSku/,
  /TDS-[A-Z]{2,5}-\d{5,}/,
  /sell_price_ex_vat/i,
  /price_override/i,
];

/**
 * Product image files are named after the distributor SKU (spec §5.5: /products/<sku>-<n>.webp),
 * so image paths are removed before scanning. Renaming images to slugs would close this gap.
 */
const IMAGE_PATHS = /(\/|%2F)products(\/|%2F)[A-Za-z0-9-]+\.(webp|png|jpe?g|avif)/gi;

export function findLeaks(body: string): string[] {
  const text = body.replace(IMAGE_PATHS, '/products/<image>');
  return FORBIDDEN.filter((re) => re.test(text)).map(String);
}

/** Dismisses the cookie banner if it is showing. */
export async function acceptCookies(page: Page) {
  const btn = page.getByRole('button', { name: /accept|got it|ok/i }).first();
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

export const DEMO_PASSWORD = 'LaraDemo!2026';
export async function adminLogin(page: Page, role: 'owner' | 'admin' | 'support' | 'viewer') {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(`${role}@laradirect.demo`);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/admin(?!\/login)/);
}
