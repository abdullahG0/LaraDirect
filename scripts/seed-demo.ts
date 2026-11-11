/**
 * Demo data for the admin (step 2.3): four admin users (one per role) and ~60 sample orders
 * spread over the last 30 days in mixed statuses, so dashboard charts and reports have data.
 *
 * Sample orders are flagged `is_sample` and their TD SYNNEX IDs start with SAMPLE-, so the
 * poller and emails skip them. Re-running adds no duplicates.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/types';
import { createRng } from '../src/lib/utils/rng';

type Db = SupabaseClient<Database>;

export const DEMO_PASSWORD = 'LaraDemo!2026';
export const DEMO_USERS = [
  { email: 'owner@laradirect.demo', name: 'Olivia Owner', role: 'owner' },
  { email: 'admin@laradirect.demo', name: 'Adam Admin', role: 'admin' },
  { email: 'support@laradirect.demo', name: 'Sam Support', role: 'support' },
  { email: 'viewer@laradirect.demo', name: 'Vera Viewer', role: 'viewer' },
] as const;

export async function seedDemoUsers(db: Db) {
  const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  for (const u of DEMO_USERS) {
    let id = list.users.find((x) => x.email === u.email)?.id;
    if (!id) {
      const { data, error: cErr } = await db.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: u.name },
      });
      if (cErr) throw cErr;
      id = data.user.id;
    }
    const { error: aErr } = await db
      .from('admin_users')
      .upsert({ user_id: id, role: u.role, name: u.name, is_active: true }, { onConflict: 'user_id' });
    if (aErr) throw aErr;
  }
  console.log(
    `Demo admin users ready (password ${DEMO_PASSWORD}): ${DEMO_USERS.map((u) => u.email).join(', ')}`,
  );
}

const PEOPLE = [
  ['Hannah Clarke', 'St Mary’s Primary School', 'Leeds', 'LS6 2AB'],
  ['James Patel', 'Oakfield Academy', 'Birmingham', 'B15 3TT'],
  ['Emily Roberts', null, 'Bristol', 'BS7 8PL'],
  ['Mohammed Khan', 'Riverside High School', 'Manchester', 'M14 5RL'],
  ['Sophie Turner', 'Hillcrest Infant School', 'Nottingham', 'NG7 1QD'],
  ['Daniel Hughes', null, 'Cardiff', 'CF10 3NP'],
  ['Grace Wilson', 'Kingsway Junior School', 'Sheffield', 'S10 2TN'],
  ['Oliver Brown', 'Northgate College', 'Newcastle upon Tyne', 'NE1 7RU'],
  ['Chloe Evans', null, 'Norwich', 'NR2 4SX'],
  ['Aisha Begum', 'Greenfields Primary', 'Leicester', 'LE2 1TR'],
  ['Thomas Wright', 'Bishop Park School', 'Exeter', 'EX4 4QJ'],
  ['Ella Thompson', null, 'Brighton', 'BN1 6AH'],
  ['Ryan Murphy', 'Lakeside Academy', 'Liverpool', 'L8 7NJ'],
  ['Isla Campbell', 'Westbrook Primary', 'Edinburgh', 'EH9 1PR'],
] as const;

const CARRIERS = [
  ['DPD', (n: string) => `https://track.dpd.co.uk/parcels/${n}`],
  ['Royal Mail', (n: string) => `https://www.royalmail.com/track-your-item#/tracking-results/${n}`],
  ['DHL', (n: string) => `https://www.dhl.com/gb-en/home/tracking.html?tracking-id=${n}`],
] as const;

type Status = Database['public']['Enums']['order_status'];

function pickStatus(daysAgo: number, r: ReturnType<typeof createRng>): Status {
  if (daysAgo < 1) return r.pick(['submitted', 'confirmed', 'confirmed', 'paid'] as Status[]);
  if (daysAgo < 3) return r.pick(['confirmed', 'shipped', 'shipped', 'backordered'] as Status[]);
  const x = r.next();
  if (x < 0.82) return 'delivered';
  if (x < 0.88) return 'cancelled';
  if (x < 0.93) return 'refunded';
  if (x < 0.97) return 'failed';
  return 'shipped';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function seedSampleOrders(db: Db, count = 60) {
  const { count: existing } = await db
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('is_sample', true);
  if ((existing ?? 0) > 0) {
    console.log(`Sample orders already present (${existing}), skipping`);
    return;
  }
  const { data: products, error } = await db
    .from('products')
    .select(
      'id, distributor_sku, name, category, cost_price_ex_vat, sell_price_inc_vat, price_override_inc_vat',
    )
    .eq('is_published', true)
    .in('stock_status', ['in_stock', 'low_stock']);
  if (error) throw error;
  if (!products.length) throw new Error('No products to build sample orders from; seed products first');

  const r = createRng('laradirect-sample-orders');
  const now = Date.now();
  // Weight towards classroom favourites.
  const weighted = products.flatMap((p) =>
    ['Headphones & Audio', 'Peripherals', 'Laptops'].includes(p.category) ? [p, p, p] : [p],
  );

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.pow(r.next(), 1.3) * 30;
    const created = new Date(now - daysAgo * 86400_000);
    const status = pickStatus(daysAgo, r);
    const [name, school, city, postcode] = r.pick(PEOPLE);
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${school ? school.toLowerCase().replace(/[^a-z]+/g, '') + '.sch.uk' : 'example.co.uk'}`;

    let { data: customer } = await db.from('customers').select('id').eq('email', email).maybeSingle();
    if (!customer) {
      const ins = await db
        .from('customers')
        .insert({
          email,
          full_name: name,
          phone: '07700 900' + String(r.int(100, 999)),
          organisation: school,
        })
        .select('id')
        .single();
      if (ins.error) throw ins.error;
      customer = ins.data;
    }

    const lineCount = r.chance(0.55) ? 1 : r.int(2, 3);
    const chosen = new Map<string, { p: (typeof products)[number]; qty: number }>();
    while (chosen.size < lineCount) {
      const p = r.pick(weighted);
      const bulk = p.category === 'Headphones & Audio' || p.category === 'Peripherals';
      chosen.set(p.id, { p, qty: bulk && r.chance(0.4) ? r.int(5, 30) : r.int(1, 2) });
    }
    const lines = [...chosen.values()].map(({ p, qty }) => ({
      p,
      qty,
      unit: Number(p.price_override_inc_vat ?? p.sell_price_inc_vat),
      cost: round2(Number(p.cost_price_ex_vat) * (1 + (r.next() - 0.5) * 0.02)),
    }));
    const subtotal = round2(lines.reduce((s, l) => s + l.unit * l.qty, 0));
    const promo = r.chance(0.12);
    const discount = promo ? round2(subtotal * 0.1) : 0;
    const nextDay = r.chance(0.15);
    const shipping = nextDay ? 9.99 : subtotal - discount >= 100 ? 0 : 4.99;
    const total = round2(subtotal - discount + shipping);
    const cost = round2(lines.reduce((s, l) => s + l.cost * l.qty, 0));
    const profit = round2((subtotal - discount) / 1.2 - cost);
    const paid = status !== 'pending_payment';
    const submitted =
      !['pending_payment', 'paid', 'failed'].includes(status) && !(status === 'cancelled' && r.chance(0.5));
    const at = (mins: number) => new Date(created.getTime() + mins * 60_000).toISOString();
    const shipTo = {
      name,
      company: school,
      line1: `${r.int(1, 220)} ${r.pick(['High Street', 'Station Road', 'Church Lane', 'Park Avenue', 'School Lane'])}`,
      line2: null,
      city,
      postcode,
      country: 'GB',
      phone: '07700 900123',
    };

    const { data: order, error: oErr } = await db
      .from('orders')
      .insert({
        customer_id: customer.id,
        email,
        status,
        ship_to: shipTo,
        bill_to: shipTo,
        subtotal_inc_vat: subtotal,
        discount_inc_vat: discount,
        shipping_inc_vat: shipping,
        vat_total: round2(total - total / 1.2),
        total_inc_vat: total,
        cost_total_ex_vat: cost,
        gross_profit: profit,
        delivery_method: nextDay ? 'next_day' : 'standard',
        promo_code: promo ? 'TEACHER10' : null,
        school_name: school,
        school_po_number: school && r.chance(0.5) ? `PO-${r.int(10000, 99999)}` : null,
        paid_at: paid ? at(2) : null,
        stripe_payment_intent: paid ? `pi_sample_${i}` : null,
        distributor_order_id: submitted ? `SAMPLE-${10000000 + i}` : null,
        distributor_status: submitted
          ? status === 'delivered'
            ? 'delivered'
            : status === 'shipped'
              ? 'shipped'
              : 'confirmed'
          : null,
        submit_attempts: status === 'failed' ? 5 : submitted ? 1 : 0,
        last_error:
          status === 'failed'
            ? r.pick([
                'VALIDATION: Order rejected by distributor: cannot be supplied for dropship',
                'OUT_OF_STOCK: Insufficient stock',
                'NETWORK: Simulated network failure talking to TD SYNNEX',
              ])
            : null,
        is_sample: true,
        created_at: created.toISOString(),
        updated_at: at(60 * 24),
      })
      .select('id')
      .single();
    if (oErr) throw oErr;

    const { error: iErr } = await db.from('order_items').insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.p.id,
        distributor_sku: l.p.distributor_sku,
        name: l.p.name,
        quantity: l.qty,
        unit_price_inc_vat: l.unit,
        unit_cost_ex_vat: l.cost,
        serial_numbers:
          status === 'delivered' && ['Laptops', 'Tablets', 'Desktops & All-in-ones'].includes(l.p.category)
            ? Array.from({ length: l.qty }, () => `SN${r.int(10000000, 99999999)}`)
            : [],
      })),
    );
    if (iErr) throw iErr;

    const events: { type: string; message: string; mins: number }[] = [
      { type: 'order.created', message: 'Order placed, awaiting payment', mins: 0 },
    ];
    if (paid) events.push({ type: 'payment.succeeded', message: 'Payment received via Stripe', mins: 2 });
    if (submitted)
      events.push({ type: 'status.submitted', message: 'Accepted by TD SYNNEX (sample)', mins: 3 });
    if (['confirmed', 'shipped', 'delivered', 'backordered'].includes(status))
      events.push({ type: 'status.confirmed', message: 'Confirmed by TD SYNNEX', mins: 30 });
    if (status === 'backordered')
      events.push({ type: 'status.backordered', message: 'Awaiting stock at TD SYNNEX', mins: 40 });
    if (status === 'shipped' || status === 'delivered')
      events.push({ type: 'status.shipped', message: 'Dispatched', mins: 60 * 20 });
    if (status === 'delivered')
      events.push({ type: 'status.delivered', message: 'Delivered', mins: 60 * 44 });
    if (status === 'failed')
      events.push({ type: 'submit.failed', message: 'Submission failed after 5 attempts', mins: 40 });
    if (status === 'cancelled' || status === 'refunded')
      events.push({ type: 'status.cancelled', message: 'Cancelled at customer request', mins: 90 });
    if (status === 'refunded')
      events.push({ type: 'status.refunded', message: 'Marked as refunded', mins: 60 * 26 });
    await db.from('order_events').insert(
      events.map((e) => ({
        order_id: order.id,
        type: e.type,
        message: e.message,
        actor: 'seed',
        created_at: at(e.mins),
      })),
    );

    if (status === 'shipped' || status === 'delivered') {
      const [carrier, url] = r.pick(CARRIERS);
      const tracking = `${carrier === 'Royal Mail' ? 'RM' : ''}${r.int(100000000, 999999999)}${r.int(1000, 9999)}`;
      await db.from('shipments').insert({
        order_id: order.id,
        carrier,
        tracking_number: tracking,
        tracking_url: url(tracking),
        shipped_at: at(60 * 20),
        delivered_at: status === 'delivered' ? at(60 * 44) : null,
      });
    }
  }
  console.log(`Created ${count} sample orders over the last 30 days`);
}
