import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Money, PageHeader, Panel, StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { getAdminOrder } from '@/lib/admin/orders';
import { requireAdminPage } from '@/lib/auth/admin';
import { customerStatusLabel, type OrderStatus } from '@/lib/orders/lifecycle';
import { trackingLink } from '@/lib/orders/notify';
import { createServiceClient } from '@/lib/supabase/server';
import { formatGBP } from '@/lib/utils/money';
import { OrderActions, RetryBanner } from './order-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data } = await createServiceClient()
    .from('orders')
    .select('order_number')
    .eq('id', params.id)
    .maybeSingle();
  return { title: data?.order_number ?? 'Order' };
}

type Address = {
  name?: string;
  company?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  postcode?: string;
  phone?: string;
};

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  await requireAdminPage('viewer');
  const detail = await getAdminOrder(createServiceClient(), params.id);
  if (!detail) notFound();
  const { order, items, shipments, events, returns, customer } = detail;
  const ship = (order.ship_to ?? {}) as Address;
  const status = order.status as OrderStatus;
  const vatRate = 0.2;

  const lines = items.map((i) => {
    const qty = i.quantity ?? 1;
    const sellEx = Number(i.unit_price_inc_vat ?? 0) / (1 + vatRate);
    const cost = Number(i.unit_cost_ex_vat ?? 0);
    return {
      ...i,
      qty,
      sellEx,
      cost,
      profit: (sellEx - cost) * qty,
      margin: sellEx > 0 ? ((sellEx - cost) / sellEx) * 100 : 0,
    };
  });

  return (
    <>
      <PageHeader
        back={{ href: '/admin/orders', label: 'Orders' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.order_number} <StatusBadge status={order.status} />
            {order.is_sample && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                sample data
              </span>
            )}
          </span>
        }
        description={`Placed ${fmtDateTime(order.created_at)} · Customer sees “${customerStatusLabel(status)}”`}
        actions={
          <OrderActions
            order={{
              id: order.id,
              status,
              orderNumber: order.order_number,
              submitted: !!order.distributor_order_id,
              paid: !!order.paid_at,
              shipTo: ship,
            }}
          />
        }
      />

      {status === 'failed' && (
        <RetryBanner orderId={order.id} error={order.last_error} attempts={order.submit_attempts ?? 0} />
      )}
      {status === 'submitting' && order.next_attempt_at && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <strong>Retrying automatically.</strong> Attempt {order.submit_attempts} failed: {order.last_error}.
          Next attempt {fmtDateTime(order.next_attempt_at)}.
        </div>
      )}
      {order.margin_alert && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          This order was sold below its margin floor because TD SYNNEX’s live cost had risen. See the timeline
          for details.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Panel title="Items" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Product</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Sell inc VAT</th>
                    <th className="px-3 py-2 text-right font-semibold">Cost ex VAT</th>
                    <th className="px-3 py-2 text-right font-semibold">Profit</th>
                    <th className="px-4 py-2 text-right font-semibold">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-t align-top">
                      <td className="px-4 py-2">
                        {l.product_id ? (
                          <Link
                            href={`/admin/products/${l.product_id}`}
                            className="font-medium hover:underline"
                          >
                            {l.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{l.name}</span>
                        )}
                        <span className="block font-mono text-xs text-muted-foreground">
                          {l.distributor_sku}
                        </span>
                        {(l.serial_numbers ?? []).length > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            Serials: {(l.serial_numbers ?? []).join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="tabular px-3 py-2 text-right">{l.qty}</td>
                      <td className="px-3 py-2 text-right">
                        <Money value={l.unit_price_inc_vat} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Money value={l.cost} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Money value={l.profit} className={l.profit < 0 ? 'text-red-600' : undefined} />
                      </td>
                      <td className="tabular px-4 py-2 text-right">{l.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t text-sm">
                  {[
                    ['Subtotal (inc VAT)', order.subtotal_inc_vat],
                    ...(Number(order.discount_inc_vat) > 0
                      ? [
                          [
                            `Discount${order.promo_code ? ` (${order.promo_code})` : ''}`,
                            -Number(order.discount_inc_vat),
                          ],
                        ]
                      : []),
                    [`Delivery (${order.delivery_method.replace('_', '-')})`, order.shipping_inc_vat],
                    ['Total (inc VAT)', order.total_inc_vat],
                    ['VAT included', order.vat_total],
                    ['Cost to TD SYNNEX (ex VAT)', order.cost_total_ex_vat],
                    ['Gross profit (goods, ex VAT)', order.gross_profit],
                  ].map(([label, value]) => (
                    <tr key={label as string}>
                      <td colSpan={5} className="px-4 py-1 text-right text-muted-foreground">
                        {label}
                      </td>
                      <td className="px-4 py-1 text-right font-medium">
                        <Money value={value as number} />
                      </td>
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>
          </Panel>

          <Panel title="Shipments">
            {shipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not dispatched yet.</p>
            ) : (
              <ul className="space-y-2">
                {shipments.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                  >
                    <span>
                      <strong>{s.carrier}</strong> <span className="font-mono">{s.tracking_number}</span>
                      <span className="block text-xs text-muted-foreground">
                        Shipped {fmtDateTime(s.shipped_at)}
                        {s.delivered_at && ` · Delivered ${fmtDateTime(s.delivered_at)}`}
                      </span>
                    </span>
                    {s.tracking_url && (
                      <a
                        href={s.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Carrier tracking <ExternalLink className="size-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Timeline" description="Every status change, email, note and admin action">
            <ol className="relative space-y-4 border-l pl-5">
              {events.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-card ${
                      e.type?.includes('fail')
                        ? 'bg-red-500'
                        : e.type === 'note'
                          ? 'bg-amber-500'
                          : e.type?.startsWith('status')
                            ? 'bg-primary'
                            : 'bg-muted-foreground/50'
                    }`}
                    aria-hidden
                  />
                  <p className="text-sm">{e.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(e.created_at)} · {e.actor} · <span className="font-mono">{e.type}</span>
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Customer">
            <p className="font-medium">{ship.name}</p>
            <p className="text-sm text-muted-foreground">{order.email}</p>
            <p className="text-sm text-muted-foreground">{ship.phone}</p>
            {customer && (
              <Link
                href={`/admin/customers/${customer.id}`}
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                View customer
              </Link>
            )}
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Deliver to
            </h3>
            <address className="mt-1 text-sm not-italic leading-relaxed">
              {[ship.name, ship.company, ship.line1, ship.line2, `${ship.city ?? ''} ${ship.postcode ?? ''}`]
                .filter(Boolean)
                .map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
            </address>
            {order.school_name && <p className="mt-2 text-sm">School: {order.school_name}</p>}
            {order.school_po_number && <p className="text-sm">School PO: {order.school_po_number}</p>}
            {order.notes && <p className="mt-2 rounded-md bg-muted p-2 text-sm">Note: {order.notes}</p>}
          </Panel>

          <Panel title="Payment">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Paid</dt>
                <dd>{order.paid_at ? fmtDateTime(order.paid_at) : 'Not paid'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Amount</dt>
                <dd>{formatGBP(Number(order.total_inc_vat ?? 0))}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Stripe payment</dt>
                <dd className="truncate font-mono text-xs">{order.stripe_payment_intent ?? '—'}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="TD SYNNEX">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Order ID</dt>
                <dd className="font-mono text-xs">{order.distributor_order_id ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{order.distributor_status ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Submit attempts</dt>
                <dd>{order.submit_attempts ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">PO reference</dt>
                <dd>{order.order_number}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Returns">
            {returns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No returns logged.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {returns.map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <span>{r.reason ?? 'Return'}</span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/admin/returns?order=${encodeURIComponent(order.order_number)}`}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Log a return
            </Link>
          </Panel>

          <a
            href={trackingLink(order.order_number, order.access_token)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Open customer tracking page <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </>
  );
}
