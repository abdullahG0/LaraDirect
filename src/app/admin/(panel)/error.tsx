'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminError({
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
    <div className="mx-auto mt-16 max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm" role="alert">
      <AlertTriangle className="mx-auto size-10 text-amber-600" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold">This page failed to load</h1>
      <p className="mt-2 break-words text-sm text-muted-foreground">{error.message || 'Unexpected error'}</p>
      {error.digest && <p className="mt-1 text-xs text-muted-foreground">Ref {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
