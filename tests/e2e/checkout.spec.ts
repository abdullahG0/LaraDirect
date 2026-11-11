// Full purchase (acceptance #3): checkout → Stripe test card (or simulated payment) → tracking page.
// Creates a real order in the database, so it only runs with E2E_CHECKOUT=1.
import { expect, test } from '@playwright/test';
import { acceptCookies } from './helpers';

test.skip(!process.env.E2E_CHECKOUT, 'set E2E_CHECKOUT=1 to place a test order');
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'runs once');

test('buy a headset and reach the tracking page', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/c/audio');
  await acceptCookies(page);
  await page.locator('a[href^="/p/"]').first().click();
  await page
    .getByRole('button', { name: /add to basket/i })
    .first()
    .click();
  await page.getByRole('dialog').getByRole('link', { name: 'Checkout' }).click();

  await page.getByLabel('Email address').fill('e2e-teacher@example.sch.uk');
  await page.getByLabel('Full name').fill('E2E Teacher');
  await page.getByLabel('Phone number').fill('07700 900123');
  await page.getByLabel('Address line 1').fill('1 Test Street');
  await page.getByLabel('Town or city').fill('Leeds');
  await page.getByLabel('Postcode').fill('LS6 2AB');
  await page.getByRole('checkbox', { name: /terms and conditions/i }).check();
  await page.getByRole('button', { name: /pay|place order/i }).click();

  await page.waitForURL(/checkout\.stripe\.com|\/order\//, { timeout: 30_000 });
  if (page.url().includes('stripe.com')) {
    await page.getByLabel(/card number/i).fill('4242 4242 4242 4242');
    await page.getByLabel(/expiration|expiry/i).fill('12 / 34');
    await page.getByLabel(/cvc/i).fill('123');
    await page.getByLabel(/name on card|cardholder/i).fill('E2E Teacher');
    await page.getByRole('button', { name: /pay/i }).click();
    await page.waitForURL(/\/order\//, { timeout: 60_000 });
  }

  await expect(page.getByRole('heading', { name: /order LD-/i })).toBeVisible();
  await expect(page.getByText(/order received|preparing your order/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('list', { name: 'Order progress' })).toBeVisible();
});
