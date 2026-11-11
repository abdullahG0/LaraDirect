'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'ld-cookie-consent-v1';

// Spec §10.6: essential cookies only, no analytics, so there's nothing to opt into.
// The banner just informs and remembers that it was dismissed.
export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(!window.localStorage.getItem(KEY));
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ essentialOnly: true, at: new Date().toISOString() }));
    } catch {
      // ignore
    }
    setShow(false);
  };

  return (
    <div role="region" aria-label="Cookie notice" className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border bg-white p-4 shadow-card-hover sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-ink-600">
          We only use essential cookies to run this site, such as remembering your basket. No tracking or
          advertising cookies.{' '}
          <Link href="/cookies" className="font-medium text-brand-600 underline underline-offset-2">
            Cookie policy
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="h-10 shrink-0 rounded-lg bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          OK, got it
        </button>
      </div>
    </div>
  );
}
