// Step 9.1 (browse → filter → PDP → basket → checkout validation) and 9.3 (screenshots + axe).
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { acceptCookies } from './helpers';

const KEY_PAGES = ['/', '/shop', '/c/laptops', '/deals', '/education', '/basket', '/checkout', '/delivery'];

test.describe('screenshots (acceptance #9)', () => {
  for (const path of KEY_PAGES) {
    test(`no horizontal overflow on ${path}`, async ({ page }, info) => {
      await page.goto(path);
      await acceptCookies(page);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `test-results/screens/${info.project.name}${path === '/' ? '/home' : path}.png`,
        fullPage: true,
      });
    });
  }
});

test.describe('accessibility (acceptance #8)', () => {
  for (const path of ['/', '/shop', '/c/laptops', '/checkout']) {
    test(`no critical axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await acceptCookies(page);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical');
      expect(critical.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test('no critical axe violations on a product page', async ({ page }) => {
    await page.goto('/shop');
    await page.locator('a[href^="/p/"]').first().click();
    await page.waitForURL(/\/p\//);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.filter((v) => v.impact === 'critical').map((v) => v.id)).toEqual([]);
  });
});

test.describe('shopping journey', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'journey runs once, on desktop');

  test('browse, filter, open a product, add to basket and validate checkout', async ({ page }) => {
    await page.goto('/c/laptops');
    await acceptCookies(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/laptops/i);

    // Filter by a brand: URL reflects it, so the result is shareable.
    // Filters navigate (URL-driven), so click and wait for the URL rather than using check().
    await page.getByRole('checkbox').first().click();
    await expect(page).toHaveURL(/\?.+=/);
    const url = page.url();
    await page.goto(url);
    await expect(page).toHaveURL(url);

    // Product page with JSON-LD.
    await page.locator('a[href^="/p/"]').first().click();
    await page.waitForURL(/\/p\//);
    const html = await (await page.request.get(page.url())).text();
    expect(html).toContain('"@type":"Product"');

    // Add to basket opens the mini basket with a server-priced total.
    await page
      .getByRole('button', { name: /add to basket/i })
      .first()
      .click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText(/your basket/i)).toBeVisible();
    await expect(drawer.getByText(/^Total$/)).toBeVisible({ timeout: 10_000 });

    // Checkout: invalid postcode and email show labelled errors (step 4.2).
    await drawer.getByRole('link', { name: 'Checkout' }).click();
    await page.waitForURL('**/checkout');
    await page.locator('#email').fill('not-an-email'); // the footer newsletter also has an "Email address" field
    await page.getByLabel('Postcode').fill('12345');
    await page.getByRole('button', { name: /pay|place order/i }).click();
    await expect(page.getByText(/valid email address/i)).toBeVisible();
    await expect(page.getByText(/valid UK postcode/i)).toBeVisible();
    await expect(page.getByLabel('Postcode')).toHaveAttribute('aria-invalid', 'true');
  });

  test('search suggests results quickly', async ({ page }) => {
    await page.goto('/');
    await acceptCookies(page);
    const box = page.getByRole('combobox').first();
    await box.fill('chromebook');
    await expect(page.getByRole('listbox').first()).toBeVisible({ timeout: 3000 });
  });
});
