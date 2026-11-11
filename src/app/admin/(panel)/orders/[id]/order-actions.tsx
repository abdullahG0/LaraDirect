'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Ban,
  CircleAlert,
  Mail,
  MapPin,
  MessageSquarePlus,
  PoundSterling,
  RefreshCw,
  RotateCw,
} from 'lucide-react';
import { useAdmin } from '@/components/admin/admin-context';
import { adminFetch, runAction } from '@/components/admin/api';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { canTransition, type OrderStatus } from '@/lib/orders/lifecycle';

interface OrderInfo {
  id: string;
  status: OrderStatus;
  orderNumber: string;
  submitted: boolean;
  paid: boolean;
  shipTo: Record<string, string | null | undefined>;
}

const fieldCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function RetryBanner({
  orderId,
  error,
  attempts,
}: {
  orderId: string;
  error: string | null;
  attempts: number;
}) {
  const router = useRouter();
  const { can } = useAdmin();
  const [busy, setBusy] = useState(false);
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
      <div className="flex items-start gap-2 text-sm">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
        <div>
          <p className="font-semibold">
            Submission to TD SYNNEX failed after {attempts} attempt{attempts === 1 ? '' : 's'}
          </p>
          <p className="text-muted-foreground">{error ?? 'Unknown error'}</p>
        </div>
      </div>
      {can('orders.manage') && (
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await runAction(
              () =>
                adminFetch<{ outcome: string; error?: string }>(`/api/admin/orders/${orderId}/retry`, {
                  body: {},
                }),
              {
                success: (x) =>
                  x.outcome === 'submitted'
                    ? 'Order submitted to TD SYNNEX'
                    : x.outcome === 'retry'
                      ? 'Still failing; retry scheduled'
                      : `Retry result: ${x.outcome}`,
              },
            );
            setBusy(false);
            if (r) router.refresh();
          }}
        >
          <RotateCw className={busy ? 'animate-spin' : undefined} /> Retry now
        </Button>
      )}
    </div>
  );
}

function NoteDialog({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquarePlus /> Add note
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Internal note</DialogTitle>
        </DialogHeader>
        <label htmlFor="note" className="sr-only">
          Note
        </label>
        <textarea
          id="note"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`${fieldCls} h-auto py-2`}
          placeholder="Only visible to admins"
        />
        <DialogFooter>
          <Button
            disabled={!text.trim()}
            onClick={async () => {
              const r = await runAction(
                () => adminFetch(`/api/admin/orders/${orderId}/note`, { body: { text } }),
                { success: 'Note added' },
              );
              if (r) {
                setText('');
                setOpen(false);
                onDone();
              }
            }}
          >
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddressDialog({ order, onDone }: { order: OrderInfo; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    name: order.shipTo.name ?? '',
    company: order.shipTo.company ?? '',
    line1: order.shipTo.line1 ?? '',
    line2: order.shipTo.line2 ?? '',
    city: order.shipTo.city ?? '',
    postcode: order.shipTo.postcode ?? '',
    phone: order.shipTo.phone ?? '',
  }));
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MapPin /> Edit address
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit delivery address</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['name', 'Name'],
              ['company', 'Company / school'],
              ['line1', 'Address line 1'],
              ['line2', 'Address line 2'],
              ['city', 'Town or city'],
              ['postcode', 'Postcode'],
              ['phone', 'Phone'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className={k === 'line1' || k === 'line2' ? 'sm:col-span-2' : undefined}>
              <span className="mb-1 block text-xs font-medium">{label}</span>
              <input value={form[k]} onChange={set(k)} className={fieldCls} />
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button
            onClick={async () => {
              const r = await runAction(
                () =>
                  adminFetch(`/api/admin/orders/${order.id}/address`, {
                    body: { ...form, company: form.company || null, line2: form.line2 || null },
                  }),
                { success: 'Address updated' },
              );
              if (r) {
                setOpen(false);
                onDone();
              }
            }}
          >
            Save address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrderActions({ order }: { order: OrderInfo }) {
  const router = useRouter();
  const { can } = useAdmin();
  const [refreshing, setRefreshing] = useState(false);
  const [reason, setReason] = useState('');
  const done = () => router.refresh();
  const manage = can('orders.manage');

  return (
    <>
      {manage && (
        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            const r = await runAction(
              () => adminFetch<{ changed: boolean }>(`/api/admin/orders/${order.id}/refresh`, { body: {} }),
              {
                success: (x) => (x.changed ? 'Status updated from TD SYNNEX' : 'No change from TD SYNNEX'),
              },
            );
            setRefreshing(false);
            if (r) done();
          }}
        >
          <RefreshCw className={refreshing ? 'animate-spin' : undefined} /> Refresh status
        </Button>
      )}
      {manage && <NoteDialog orderId={order.id} onDone={done} />}
      {manage && !order.submitted && ['pending_payment', 'paid', 'failed'].includes(order.status) && (
        <AddressDialog order={order} onDone={done} />
      )}
      {manage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Mail /> Resend email
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(
              [
                ['order_confirmation', 'Order confirmation'],
                ['order_dispatched', 'Dispatched (tracking)'],
                ['order_delivered', 'Delivered'],
                ['order_problem', 'Problem with order'],
              ] as const
            ).map(([t, label]) => (
              <DropdownMenuItem
                key={t}
                onSelect={() =>
                  runAction(
                    () => adminFetch(`/api/admin/orders/${order.id}/resend`, { body: { template: t } }),
                    { success: `${label} email sent` },
                  ).then(done)
                }
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {manage && order.status === 'cancelled' && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" size="sm">
              <PoundSterling /> Mark refunded
            </Button>
          }
          title="Mark this order as refunded?"
          description="Do this after issuing the refund in the Stripe dashboard."
          confirmLabel="Mark refunded"
          onConfirm={async () => {
            if (
              await runAction(() => adminFetch(`/api/admin/orders/${order.id}/refund`, { body: {} }), {
                success: 'Marked as refunded',
              })
            )
              done();
          }}
        />
      )}
      {manage && canTransition(order.status, 'cancelled') && (
        <ConfirmDialog
          trigger={
            <Button variant="destructive" size="sm">
              <Ban /> Cancel order
            </Button>
          }
          title={`Cancel ${order.orderNumber}?`}
          description={
            order.submitted
              ? 'We’ll ask TD SYNNEX to cancel it. This only works before it ships.'
              : order.paid
                ? 'The customer has paid, so you’ll need to refund them in Stripe afterwards.'
                : 'The order hasn’t been paid or sent to TD SYNNEX yet.'
          }
          confirmLabel="Cancel order"
          destructive
          onConfirm={async () => {
            if (
              await runAction(
                () =>
                  adminFetch(`/api/admin/orders/${order.id}/cancel`, {
                    body: { reason: reason || undefined },
                  }),
                { success: 'Order cancelled' },
              )
            )
              done();
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Reason (optional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={fieldCls} />
          </label>
        </ConfirmDialog>
      )}
    </>
  );
}
