import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const metadata = { title: 'Not allowed' };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
      <ShieldAlert className="mx-auto size-10 text-amber-600" aria-hidden />
      <h1 className="mt-3 text-xl font-semibold">You don’t have access to this page</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your role doesn’t include this area. Ask the account owner if you need access.
      </p>
      <Link
        href="/admin"
        className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
