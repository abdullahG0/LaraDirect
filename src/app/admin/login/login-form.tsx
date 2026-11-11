'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

// Demo accounts created by `npm run db:seed` (step 2.3). Shown only in demo mode.
const DEMO_USERS = [
  { role: 'Owner', email: 'owner@laradirect.demo' },
  { role: 'Admin', email: 'admin@laradirect.demo' },
  { role: 'Support', email: 'support@laradirect.demo' },
  { role: 'Viewer', email: 'viewer@laradirect.demo' },
];
const DEMO_PASSWORD = 'LaraDemo!2026';

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await createBrowserClient().auth.signInWithPassword(creds ?? { email, password });
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : err.message);
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const input =
    'h-11 w-full rounded-lg border border-slate-300 px-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7490]';

  return (
    <>
      <form onSubmit={signIn} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0E1E3E] font-semibold text-white hover:bg-[#16264A] disabled:opacity-60"
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Sign in
        </button>
      </form>
      {demo && (
        <div className="mt-6 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                disabled={busy}
                onClick={() => signIn(undefined, { email: u.email, password: DEMO_PASSWORD })}
                className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E7490]"
              >
                <span className="block font-medium">{u.role}</span>
                <span className="block truncate text-xs text-slate-500">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
