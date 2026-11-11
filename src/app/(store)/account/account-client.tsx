'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Download, Loader2, LogOut, MapPin, Package, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatGBP } from '@/lib/utils/money';

const inputCls =
  'h-11 w-full rounded-xl border border-input bg-white px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const primaryBtn =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
const card = 'rounded-2xl bg-white p-6 shadow-card';

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? 'Something went wrong');
  return json;
}

export function AccountAuth() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createBrowserClient();
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error)
        setMessage({
          ok: false,
          text:
            error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message,
        });
      else router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/account` },
      });
      if (error) setMessage({ ok: false, text: error.message });
      else if (data.session) router.refresh();
      else setMessage({ ok: true, text: 'Check your email for a link to confirm your account.' });
    }
    setBusy(false);
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className={card} aria-labelledby="auth-h">
        <h2 id="auth-h" className="font-heading text-xl font-bold text-brand-900">
          {mode === 'signin' ? 'Sign in' : 'Create an account'}
        </h2>
        <p className="mt-1 text-sm text-ink-600">
          {mode === 'signin'
            ? 'See your orders, saved addresses and details.'
            : 'Use the same email you order with and we’ll link your past orders.'}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            {mode === 'signup' && (
              <span className="mt-1 block text-xs text-ink-600">At least 8 characters</span>
            )}
          </label>
          {message && (
            <p
              role={message.ok ? 'status' : 'alert'}
              className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-success-600/10 text-success-600' : 'bg-danger-500/10 text-danger-500'}`}
            >
              {message.text}
            </p>
          )}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}{' '}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="mt-4 text-sm text-ink-600">
          {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-semibold text-brand-600 underline-offset-2 hover:underline"
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </section>
      <section className={card} aria-labelledby="track-h">
        <h2 id="track-h" className="font-heading text-xl font-bold text-brand-900">
          Checked out as a guest?
        </h2>
        <p className="mt-2 text-ink-600">
          You don’t need an account to track an order. Use the <strong>Track your order</strong> link in your
          confirmation email: it shows live progress, carrier tracking and your items.
        </p>
        <p className="mt-3 text-ink-600">
          Can’t find the email?{' '}
          <Link href="/contact" className="font-medium text-brand-600 underline">
            Contact us
          </Link>{' '}
          with your order number.
        </p>
      </section>
    </div>
  );
}

interface OrderSummary {
  orderNumber: string;
  createdAt: string;
  statusLabel: string;
  status: string;
  total: number;
  href: string;
  items: string[];
}

interface Address {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  isDefault: boolean;
}

export function AccountDashboard({
  email,
  details,
  orders,
  addresses,
}: {
  email: string;
  details: { fullName: string; phone: string; organisation: string };
  orders: OrderSummary[];
  addresses: Address[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(details);
  const [addr, setAddr] = useState({
    name: details.fullName,
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    isDefault: addresses.length === 0,
  });
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
      return true;
    } catch (err) {
      toast.error((err as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    await createBrowserClient().auth.signOut();
    router.refresh();
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className={card} aria-labelledby="orders-h">
        <h2 id="orders-h" className="flex items-center gap-2 font-heading text-xl font-bold text-brand-900">
          <Package className="size-5 text-brand-600" aria-hidden /> Your orders
        </h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-ink-600">
            No orders yet.{' '}
            <Link href="/shop" className="font-medium text-brand-600 underline">
              Start shopping
            </Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {orders.map((o) => (
              <li key={o.orderNumber} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <Link href={o.href} className="font-semibold text-brand-900 hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-sm text-ink-600">
                    {new Date(o.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    · {o.statusLabel}
                  </p>
                  <p className="line-clamp-1 text-sm text-ink-600">{o.items.join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className="tabular font-semibold">{formatGBP(o.total)}</p>
                  <Link href={o.href} className="text-sm font-medium text-brand-600 hover:underline">
                    Track order
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-6">
        <section className={card} aria-labelledby="details-h">
          <h2
            id="details-h"
            className="flex items-center gap-2 font-heading text-lg font-bold text-brand-900"
          >
            <UserRound className="size-5 text-brand-600" aria-hidden /> Your details
          </h2>
          <p className="mt-1 text-sm text-ink-600">{email}</p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run('details', () => call('/api/account', 'PATCH', form), 'Details saved');
            }}
          >
            {(
              [
                ['fullName', 'Full name', 'name'],
                ['phone', 'Phone', 'tel'],
                ['organisation', 'School or organisation', 'organization'],
              ] as const
            ).map(([k, label, ac]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-sm font-medium">{label}</span>
                <input
                  autoComplete={ac}
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className={inputCls}
                />
              </label>
            ))}
            <button type="submit" disabled={busy === 'details'} className={primaryBtn}>
              Save details
            </button>
          </form>
        </section>

        <section className={card} aria-labelledby="addr-h">
          <h2 id="addr-h" className="flex items-center gap-2 font-heading text-lg font-bold text-brand-900">
            <MapPin className="size-5 text-brand-600" aria-hidden /> Saved addresses
          </h2>
          <ul className="mt-3 space-y-2">
            {addresses.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 rounded-xl border p-3 text-sm">
                <span>
                  {[a.name, a.line1, a.line2, `${a.city} ${a.postcode}`].filter(Boolean).join(', ')}
                  {a.isDefault && <span className="ml-1 text-xs font-semibold text-brand-600">Default</span>}
                </span>
                <button
                  type="button"
                  aria-label={`Delete address ${a.line1}`}
                  onClick={() =>
                    run(
                      `del-${a.id}`,
                      () => call(`/api/account?address=${a.id}`, 'DELETE'),
                      'Address removed',
                    )
                  }
                  className="grid size-8 shrink-0 place-items-center rounded-full text-ink-600 hover:bg-accent hover:text-danger-500"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {adding ? (
            <form
              className="mt-3 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await run('addr', () => call('/api/account', 'POST', addr), 'Address saved')) {
                  setAdding(false);
                  setAddr({
                    name: form.fullName,
                    line1: '',
                    line2: '',
                    city: '',
                    postcode: '',
                    isDefault: false,
                  });
                }
              }}
            >
              {(
                [
                  ['name', 'Name'],
                  ['line1', 'Address line 1'],
                  ['line2', 'Address line 2 (optional)'],
                  ['city', 'Town or city'],
                  ['postcode', 'Postcode'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-sm font-medium">{label}</span>
                  <input
                    value={addr[k]}
                    required={k !== 'line2'}
                    onChange={(e) => setAddr({ ...addr, [k]: e.target.value })}
                    className={inputCls}
                  />
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={addr.isDefault}
                  onChange={(e) => setAddr({ ...addr, isDefault: e.target.checked })}
                  className="size-4 accent-[#0E7490]"
                />{' '}
                Make this my default
              </label>
              <button type="submit" disabled={busy === 'addr'} className={primaryBtn}>
                Save address
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-3 text-sm font-semibold text-brand-600 hover:underline"
            >
              + Add an address
            </button>
          )}
        </section>

        <section className={card} aria-labelledby="privacy-h">
          <h2 id="privacy-h" className="font-heading text-lg font-bold text-brand-900">
            Your data
          </h2>
          <a
            href="/api/account/export"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"
          >
            <Download className="size-4" aria-hidden /> Download my data (JSON)
          </a>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-danger-500">Delete my account</summary>
            <p className="mt-2 text-ink-600">
              This removes your login, contact details and saved addresses. We keep order records for six
              years for tax, with your email and phone removed. Type <strong>DELETE</strong> to confirm.
            </p>
            <label htmlFor="confirm-delete" className="sr-only">
              Type DELETE to confirm
            </label>
            <input
              id="confirm-delete"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`${inputCls} mt-2`}
            />
            <button
              type="button"
              disabled={confirm !== 'DELETE' || busy === 'delete'}
              onClick={async () => {
                if (
                  await run(
                    'delete',
                    () => call('/api/account/delete', 'POST', { confirm }),
                    'Your account has been deleted',
                  )
                ) {
                  await createBrowserClient().auth.signOut();
                  router.replace('/');
                }
              }}
              className="mt-2 h-10 rounded-full bg-danger-500 px-5 font-semibold text-white disabled:opacity-50"
            >
              Delete my account
            </button>
          </details>
        </section>

        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-600 hover:text-brand-900"
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}
