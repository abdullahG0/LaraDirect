// Step 2.2 security test: runs against the real Supabase project when credentials are present
// (e.g. `npx vitest run tests/unit/rls.test.ts` with .env.local loaded, or in CI with secrets).
// Without them it is skipped, so plain `npm test` stays offline.
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const FORBIDDEN_COLUMNS = [
  'cost_price_ex_vat',
  'margin_pct',
  'distributor_sku',
  'sell_price_ex_vat',
  'price_override_inc_vat',
  'rrp_ex_vat',
];

describe.skipIf(!url || !anonKey)('row level security (anon)', () => {
  const anon =
    url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : (null as never);

  it('cannot read the products table', async () => {
    const { data } = await anon.from('products').select('*').limit(5);
    expect(data ?? []).toHaveLength(0);
  });

  it('public_products exposes no cost, margin or distributor columns', async () => {
    const { data, error } = await anon.from('public_products').select('*').limit(1);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    for (const col of FORBIDDEN_COLUMNS) expect(Object.keys(data![0]!)).not.toContain(col);
  });

  it.each([
    'orders',
    'order_items',
    'customers',
    'settings',
    'distributor_logs',
    'audit_log',
    'pricing_rules',
    'admin_users',
    'outbox',
    'mock_distributor_state',
  ])('cannot read %s', async (table) => {
    const { data } = await anon.from(table).select('*').limit(1);
    expect(data ?? []).toHaveLength(0);
  });
});
