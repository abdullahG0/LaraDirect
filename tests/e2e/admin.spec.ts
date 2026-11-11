// Step 9.1: admin role restrictions (acceptance #7) and the failed-order retry (acceptance #4).
// Needs the demo users from `npm run db:seed`.
import { expect, test } from '@playwright/test';
import { adminLogin } from './helpers';

test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, 'admin tests run on desktop');

test('signed-out visitors are sent to the login page, and admin APIs return 401', async ({
  page,
  request,
}) => {
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/login/);
  const res = await request.get('/api/admin/orders');
  expect(res.status()).toBe(401);
});

test('viewer gets 403 on every mutating admin route', async ({ page, baseURL }) => {
  await adminLogin(page, 'viewer');
  const origin = new URL(baseURL!).origin;
  const calls: [string, string, unknown][] = [
    ['POST', '/api/admin/pricing/recalculate', {}],
    [
      'POST',
      '/api/admin/pricing-rules',
      { scope: 'brand', scopeValue: 'HP', markupType: 'percent', markupValue: 5 },
    ],
    ['PATCH', '/api/admin/products', { id: '00000000-0000-0000-0000-000000000000', isPublished: false }],
    [
      'POST',
      '/api/admin/products/bulk',
      { action: 'publish', ids: ['00000000-0000-0000-0000-000000000000'] },
    ],
    ['POST', '/api/admin/sync', {}],
    ['POST', '/api/admin/orders/00000000-0000-0000-0000-000000000000/retry', {}],
    ['PUT', '/api/admin/settings', { key: 'vat_rate', value: 0.2 }],
    ['POST', '/api/admin/users', { email: 'x@y.z', name: 'X', role: 'viewer' }],
    ['POST', '/api/admin/returns', { orderNumber: 'LD-1', reason: 'test' }],
  ];
  for (const [method, url, data] of calls) {
    const res = await page.request.fetch(url, { method, data, headers: { origin } });
    expect(res.status(), `${method} ${url}`).toBe(403);
  }
});

test('support can see pricing but not edit it', async ({ page }) => {
  await adminLogin(page, 'support');
  await page.goto('/admin/pricing');
  await expect(page.getByText(/only admins and owners can edit rules/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'New rule' })).toHaveCount(0);
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/forbidden/);
});

test('admin role cannot open owner-only pages', async ({ page }) => {
  await adminLogin(page, 'admin');
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/forbidden/);
});

test('dashboard loads for the owner with KPIs and charts', async ({ page }) => {
  await adminLogin(page, 'owner');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Revenue, 30 days')).toBeVisible();
  await expect(page.getByText('Needs attention').first()).toBeVisible();
});

// Places a real (mock-distributor) order, so it only runs when explicitly enabled.
test('failed order can be retried from the dashboard (acceptance #4)', async ({ page }) => {
  test.skip(
    !process.env.E2E_FAILED_ORDER_ID,
    'set E2E_FAILED_ORDER_ID to a failed order id (see docs/DEMO_SCRIPT.md)',
  );
  await adminLogin(page, 'admin');
  await page.goto(`/admin/orders/${process.env.E2E_FAILED_ORDER_ID}`);
  await page.getByRole('button', { name: 'Retry now' }).click();
  await expect(page.getByText(/submitted to TD SYNNEX|retry scheduled/i)).toBeVisible({ timeout: 20_000 });
});
