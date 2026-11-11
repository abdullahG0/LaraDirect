'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center" role="alert">
      <h1 className="font-heading text-3xl font-bold text-brand-900">Sorry, something went wrong</h1>
      <p className="mt-2 text-ink-600">Please try again. If it keeps happening, contact us and we’ll help.</p>
      {error.digest && <p className="mt-1 text-xs text-ink-400">Reference: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full bg-cta px-6 font-semibold text-cta-foreground hover:bg-cta-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-brand-900 px-6 font-semibold text-brand-900"
        >
          Home page
        </Link>
      </div>
    </div>
  );
}
