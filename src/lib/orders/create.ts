// Creates a pending_payment order from a checkout request (step 4.3). Prices come from the
// database, never the client; stock and cost are re-checked live with the distributor.
import type { Db, Json } from '@/lib/supabase/db';
import { must } from '@/lib/supabase/db';
import { computeTotals, type BasketTotals } from '@/lib/basket/totals';
import { calculatePrice } from '@/lib/pricing/engine';
import { loadRules } from '@/lib/pricing/rules';
import { distributorFor } from '@/lib/services/distributor';
import type { StoreSettings } from '@/lib/settings';
import { HttpError } from '@/lib/utils/errors';
import { round2 } from '@/lib/utils/money';
import type { CheckoutRequest } from '@/lib/validation/checkout';
import { addOrderEvent } from './lifecycle';

export interface CreatedOrderLine {
  productId: string;
  name: string;
  image: string | null;
  quantity: number;
  unitPriceIncVat: number;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  accessToken: string;
  email: string;
  totals: BasketTotals;
  lines: CreatedOrderLine[];
  marginAlert: boolean;
}

export async function createOrder(
  db: Db,
  req: CheckoutRequest,
  settings: StoreSettings,
  opts: { userId?: string | null } = {},
): Promise<CreatedOrder> {
  const ids = [...new Set(req.lines.map((l) => l.productId))];
  const qtyById = new Map<string, number>();
  for (const l of req.lines) qtyById.set(l.productId, (qtyById.get(l.productId) ?? 0) + l.quantity);

  const products = must(
    await db
      .from('products')
      .select(
        'id, distributor_sku, name, title_override, brand, category, images, sell_price_inc_vat, price_override_inc_vat, cost_price_ex_vat, stock_status, stock_qty, is_published',
      )
      .in('id', ids),
    'load products',
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const id of ids) {
    const p = byId.get(id);
    if (!p || !p.is_published || p.stock_status === 'discontinued') {
      throw new HttpError(
        409,
        'UNAVAILABLE',
        `${p?.title_override ?? p?.name ?? 'An item'} is no longer available. Please remove it from your basket.`,
      );
    }
  }

  // Live stock and cost check with the distributor.
  const d = await distributorFor(db, settings);
  let live: Awaited<ReturnType<typeof d.getPriceStock>> = [];
  try {
    live = await d.getPriceStock(products.map((p) => p.distributor_sku));
  } catch (err) {
    // A flaky distributor shouldn't block payment: fall back to the last synced values.
    console.warn(`checkout live check failed, using synced stock: ${(err as Error).message}`);
  }
  const liveBySku = new Map(live.map((l) => [l.sku, l]));

  const rules = await loadRules(db);
  const below: string[] = [];
  const lines = ids.map((id) => {
    const p = byId.get(id)!;
    const name = p.title_override ?? p.name;
    const qty = qtyById.get(id)!;
    const ls = liveBySku.get(p.distributor_sku);
    const stockStatus = ls?.stockStatus ?? p.stock_status;
    const stockQty = ls?.stockQty ?? p.stock_qty;
    if (stockStatus !== 'backorder') {
      if (stockStatus === 'out_of_stock' || stockQty <= 0) {
        throw new HttpError(
          409,
          'OUT_OF_STOCK',
          `Sorry, ${name} has just sold out. Please remove it to continue.`,
        );
      }
      if (stockQty < qty) {
        throw new HttpError(
          409,
          'LOW_STOCK',
          `Only ${stockQty} of ${name} left. Please reduce the quantity.`,
        );
      }
    }
    const unitPrice = Number(p.price_override_inc_vat ?? p.sell_price_inc_vat);
    if (!unitPrice) throw new HttpError(409, 'UNAVAILABLE', `${name} can't be bought right now.`);
    const unitCost = ls?.costPriceExVat ?? Number(p.cost_price_ex_vat);
    const check = calculatePrice(
      {
        sku: p.distributor_sku,
        brand: p.brand,
        category: p.category,
        costPriceExVat: unitCost,
        priceOverrideIncVat: unitPrice,
      },
      rules,
      settings.vatRate,
    );
    if (check.marginStatus !== 'ok') below.push(`${name} (${check.marginPct}%)`);
    return { p, name, qty, unitPrice, unitCost };
  });

  const totals = computeTotals({
    lines: lines.map((l) => ({ unitPriceIncVat: l.unitPrice, quantity: l.qty })),
    settings,
    promoCode: req.promoCode,
    deliveryMethod: req.details.deliveryMethod,
  });
  if (totals.promo && !totals.promo.applied) throw new HttpError(400, 'PROMO', totals.promo.message);

  const costTotal = round2(lines.reduce((s, l) => s + l.unitCost * l.qty, 0));
  const goodsExVat = round2((totals.subtotal - totals.discount) / (1 + settings.vatRate));
  const det = req.details;

  // Find or create the customer record (by email, case-insensitive).
  const email = det.email.toLowerCase();
  const { data: existingCustomer } = await db
    .from('customers')
    .select('id, user_id')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();
  let customerId = existingCustomer?.id ?? null;
  if (!customerId) {
    const created = must(
      await db
        .from('customers')
        .insert({
          email,
          full_name: det.fullName,
          phone: det.phone,
          organisation: det.schoolName || det.company || null,
          user_id: opts.userId ?? null,
        })
        .select('id')
        .single(),
      'create customer',
    );
    customerId = created.id;
  } else if (opts.userId && !existingCustomer?.user_id) {
    await db.from('customers').update({ user_id: opts.userId }).eq('id', customerId);
  }

  const address = {
    name: det.fullName,
    company: det.deliveringToSchool ? det.schoolName || null : det.company || null,
    line1: det.line1,
    line2: det.line2 || null,
    city: det.city,
    postcode: det.postcode,
    country: 'GB',
    phone: det.phone,
  };

  const order = must(
    await db
      .from('orders')
      .insert({
        customer_id: customerId,
        email,
        status: 'pending_payment',
        ship_to: address as Json,
        bill_to: address as Json,
        subtotal_inc_vat: totals.subtotal,
        discount_inc_vat: totals.discount,
        shipping_inc_vat: totals.shipping,
        vat_total: totals.vat,
        total_inc_vat: totals.total,
        cost_total_ex_vat: costTotal,
        gross_profit: round2(goodsExVat - costTotal),
        delivery_method: totals.deliveryMethod,
        promo_code: totals.promo?.applied ? totals.promo.code : null,
        school_name: det.deliveringToSchool ? det.schoolName || null : null,
        school_po_number: det.schoolPoNumber || null,
        notes: det.notes || null,
        margin_alert: below.length > 0,
      })
      .select('id, order_number, access_token')
      .single(),
    'create order',
  );

  must(
    await db.from('order_items').insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.p.id,
        distributor_sku: l.p.distributor_sku,
        name: l.name,
        quantity: l.qty,
        unit_price_inc_vat: l.unitPrice,
        unit_cost_ex_vat: l.unitCost,
      })),
    ),
    'create order items',
  );
  await addOrderEvent(
    db,
    order.id,
    'order.created',
    `Order placed (${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'}), awaiting payment`,
    {
      total: totals.total,
    },
    'customer',
  );
  if (below.length) {
    await addOrderEvent(
      db,
      order.id,
      'pricing.below_floor',
      `Margin below floor at checkout: ${below.join(', ')}`,
      { below },
    );
  }

  return {
    id: order.id,
    orderNumber: order.order_number,
    accessToken: order.access_token,
    email,
    totals,
    marginAlert: below.length > 0,
    lines: lines.map((l) => ({
      productId: l.p.id,
      name: l.name,
      image: l.p.images?.[0] ?? null,
      quantity: l.qty,
      unitPriceIncVat: l.unitPrice,
    })),
  };
}
