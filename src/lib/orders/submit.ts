// submitOrder (spec §8.1 step 3, build step 5.2).
//   - Re-checks live price and stock through the adapter.
//   - Builds PlaceOrderRequest with reference = order_number and idempotencyKey = order.id.
//   - Success → submitted (or backordered). Retryable error → stays `submitting` with
//     next_attempt_at backoff 1/5/15 min, max 5 attempts. Non-retryable → failed + admin alert.
import { DistributorError, type Distributor, type PlaceOrderRequest, type ShipTo } from '@/lib/distributor';
import type { Db } from '@/lib/supabase/db';
import { must } from '@/lib/supabase/db';
import { calculatePrice } from '@/lib/pricing/engine';
import { loadRules } from '@/lib/pricing/rules';
import { getSettings, type StoreSettings } from '@/lib/settings';
import { distributorFor } from '@/lib/services/distributor';
import { round2 } from '@/lib/utils/money';
import { addOrderEvent, transitionOrder, type OrderStatus } from './lifecycle';
import { notifyAdmins, notifyCustomer } from './notify';

export const MAX_ATTEMPTS = 5;
const BACKOFF_MIN = [1, 5, 15, 15, 15];

export function nextAttemptDelayMs(attempt: number): number {
  return BACKOFF_MIN[Math.min(attempt - 1, BACKOFF_MIN.length - 1)]! * 60_000;
}

export type SubmitOutcome =
  | { outcome: 'submitted'; distributorOrderId: string; status: OrderStatus }
  | { outcome: 'retry'; attempt: number; nextAttemptAt: string; error: string }
  | { outcome: 'failed'; error: string }
  | { outcome: 'skipped'; reason: string };

interface SubmitOptions {
  actor?: string;
  distributor?: Distributor;
  settings?: StoreSettings;
  now?: () => Date;
}

export async function submitOrder(db: Db, orderId: string, opts: SubmitOptions = {}): Promise<SubmitOutcome> {
  const now = opts.now ?? (() => new Date());
  const actor = opts.actor ?? 'system';
  const order = must(await db.from('orders').select('*').eq('id', orderId).single(), 'load order');
  const status = order.status as OrderStatus;

  if (status === 'paid' || status === 'failed') {
    await transitionOrder(db, orderId, 'submitting', {
      actor,
      message: status === 'failed' ? 'Retrying submission to TD SYNNEX' : 'Submitting to TD SYNNEX',
      patch: status === 'failed' ? { submit_attempts: 0, last_error: null } : {},
    });
  } else if (status !== 'submitting') {
    return { outcome: 'skipped', reason: `Order is ${status}` };
  }

  const attempt = (status === 'failed' ? 0 : (order.submit_attempts ?? 0)) + 1;
  const settings = opts.settings ?? (await getSettings(db));
  const d = opts.distributor ?? (await distributorFor(db, settings));
  const items = must(
    await db
      .from('order_items')
      .select('id, product_id, distributor_sku, name, quantity, unit_price_inc_vat, unit_cost_ex_vat')
      .eq('order_id', orderId),
    'load order items',
  );

  try {
    // Live re-check (spec §7.3 price protection): use today's cost as the expected cost, and flag
    // the order if that cost pushes the margin below the floor.
    const skus = items.map((i) => i.distributor_sku!).filter(Boolean);
    const live = new Map((await d.getPriceStock(skus)).map((p) => [p.sku, p]));
    const rules = await loadRules(db);
    const { data: products } = await db
      .from('products')
      .select('id, distributor_sku, brand, category')
      .in('distributor_sku', skus);
    const productBySku = new Map((products ?? []).map((p) => [p.distributor_sku, p]));
    const belowFloor: string[] = [];
    for (const i of items) {
      const ps = live.get(i.distributor_sku!);
      const p = productBySku.get(i.distributor_sku!);
      if (!ps || !p) continue;
      const check = calculatePrice(
        {
          sku: ps.sku,
          brand: p.brand,
          category: p.category,
          costPriceExVat: ps.costPriceExVat,
          priceOverrideIncVat: Number(i.unit_price_inc_vat),
        },
        rules,
        settings.vatRate,
      );
      if (check.marginStatus !== 'ok') belowFloor.push(`${i.name} (${check.marginPct}% margin)`);
    }
    if (belowFloor.length && !order.margin_alert) {
      await db.from('orders').update({ margin_alert: true }).eq('id', orderId);
      await addOrderEvent(
        db,
        orderId,
        'pricing.below_floor',
        `Live cost puts margin below floor: ${belowFloor.join(', ')}`,
        { belowFloor },
      );
      await notifyAdmins(
        db,
        `Below-floor margin on ${order.order_number}`,
        `Live TD SYNNEX cost has risen: ${belowFloor.join(', ')}.`,
        orderId,
      );
      if (settings.featureFlags.hold_below_floor) {
        throw new DistributorError('Held for review: margin below floor', 'VALIDATION', false);
      }
    }

    const shipTo = order.ship_to as unknown as ShipTo & { name: string };
    const req: PlaceOrderRequest = {
      reference: order.order_number,
      idempotencyKey: order.id,
      lines: items.map((i) => ({
        sku: i.distributor_sku!,
        quantity: i.quantity ?? 1,
        expectedCostExVat: live.get(i.distributor_sku!)?.costPriceExVat ?? Number(i.unit_cost_ex_vat),
      })),
      shipTo: {
        name: shipTo.name,
        company: shipTo.company || undefined,
        line1: shipTo.line1,
        line2: shipTo.line2 || undefined,
        city: shipTo.city,
        postcode: shipTo.postcode,
        country: 'GB',
        phone: shipTo.phone,
        email: order.email,
      },
      dropship: true,
      blindShipment: settings.featureFlags.blind_shipment,
      notes: order.school_po_number ? `School PO ${order.school_po_number}` : undefined,
    };

    const result = await d.placeOrder(req);

    // Store the confirmed cost per line and the order's cost/profit totals.
    const costBySku = new Map(result.lines.map((l) => [l.sku, l.confirmedCostExVat]));
    let costTotal = 0;
    for (const i of items) {
      const c = costBySku.get(i.distributor_sku!) ?? Number(i.unit_cost_ex_vat);
      costTotal += c * (i.quantity ?? 1);
      if (c !== Number(i.unit_cost_ex_vat))
        await db.from('order_items').update({ unit_cost_ex_vat: c }).eq('id', i.id);
    }
    const goodsExVat = round2(
      (Number(order.subtotal_inc_vat ?? 0) - Number(order.discount_inc_vat ?? 0)) / (1 + settings.vatRate),
    );

    await transitionOrder(db, orderId, 'submitted', {
      actor,
      message: `Accepted by ${d.name} as ${result.distributorOrderId}`,
      data: { distributorOrderId: result.distributorOrderId, attempt },
      patch: {
        distributor_order_id: result.distributorOrderId,
        distributor_status: result.status,
        distributor_idempotency_key: order.id,
        submit_attempts: attempt,
        last_error: null,
        next_attempt_at: null,
        cost_total_ex_vat: round2(costTotal),
        gross_profit: round2(goodsExVat - costTotal),
      },
    });
    let final: OrderStatus = 'submitted';
    if (result.status === 'backordered') {
      const eta = result.lines.find((l) => l.eta)?.eta;
      await transitionOrder(db, orderId, 'backordered', {
        message: `Backordered at TD SYNNEX${eta ? `, expected ${eta}` : ''}`,
        data: { eta },
      });
      final = 'backordered';
    }
    return { outcome: 'submitted', distributorOrderId: result.distributorOrderId, status: final };
  } catch (err) {
    const de = err instanceof DistributorError ? err : null;
    const message = de ? `${de.code}: ${de.message}` : (err as Error).message;
    const retryable = de ? de.retryable : true;

    if (retryable && attempt < MAX_ATTEMPTS) {
      const nextAt = new Date(now().getTime() + nextAttemptDelayMs(attempt)).toISOString();
      await db
        .from('orders')
        .update({
          submit_attempts: attempt,
          last_error: message,
          next_attempt_at: nextAt,
          updated_at: now().toISOString(),
        })
        .eq('id', orderId);
      await addOrderEvent(
        db,
        orderId,
        'submit.retry',
        `Attempt ${attempt} failed (${message}); retrying at ${nextAt.slice(11, 16)} UTC`,
        { attempt, error: message },
        actor,
      );
      return { outcome: 'retry', attempt, nextAttemptAt: nextAt, error: message };
    }

    await transitionOrder(db, orderId, 'failed', {
      actor,
      type: 'submit.failed',
      message: `Submission failed after ${attempt} attempt${attempt === 1 ? '' : 's'}: ${message}`,
      data: { attempt, error: message, code: de?.code },
      patch: { submit_attempts: attempt, last_error: message, next_attempt_at: null },
    });
    await notifyAdmins(
      db,
      `Order ${order.order_number} failed`,
      `Submission to TD SYNNEX failed: ${message}`,
      orderId,
    );
    await notifyCustomer(db, orderId, 'order_problem');
    return { outcome: 'failed', error: message };
  }
}

/** Cron: submit paid orders and retry due ones (POST /api/cron/retry-submissions). */
export async function processDueSubmissions(
  db: Db,
  now = new Date(),
): Promise<{ processed: number; results: Record<string, SubmitOutcome['outcome']> }> {
  const { data } = await db
    .from('orders')
    .select('id, order_number, status, next_attempt_at, updated_at')
    .in('status', ['paid', 'submitting'])
    .eq('is_sample', false)
    .order('created_at')
    .limit(25);
  const due = (data ?? []).filter((o) => {
    if (o.status === 'paid') return true;
    if (o.next_attempt_at) return new Date(o.next_attempt_at) <= now;
    // `submitting` with no retry scheduled: a worker died mid-submit. Pick it up after 2 minutes.
    return o.updated_at ? now.getTime() - new Date(o.updated_at).getTime() > 120_000 : true;
  });
  const results: Record<string, SubmitOutcome['outcome']> = {};
  const settings = await getSettings(db);
  const d = await distributorFor(db, settings);
  for (const o of due) {
    try {
      results[o.order_number] = (await submitOrder(db, o.id, { distributor: d, settings })).outcome;
    } catch (err) {
      console.error(`submit ${o.order_number}: ${(err as Error).message}`);
      results[o.order_number] = 'skipped';
    }
  }
  return { processed: due.length, results };
}
