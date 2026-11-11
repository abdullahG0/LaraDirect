import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/** Browser client for client components. Uses the publishable key only, so RLS applies. */
export function createBrowserClient() {
  return createSsrBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
