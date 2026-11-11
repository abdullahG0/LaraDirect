import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient as createSsrClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/**
 * Per-request client for server components, route handlers and server actions.
 * Acts as the signed-in user (or anon), so RLS applies.
 */
export function createServerClient() {
  const cookieStore = cookies();
  return createSsrClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server components can't set cookies. Middleware refreshes the session instead.
          }
        },
      },
    },
  );
}

/**
 * Anonymous client with no session or cookies, for public catalogue reads.
 * Safe inside cached functions (unstable_cache), unlike createServerClient.
 */
export function createPublicClient() {
  return createClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Admin client using the secret key. Bypasses RLS: use only for trusted server work
 * (sync, pricing, cron, admin APIs). Never pass its results to the browser unfiltered.
 */
export function createServiceClient() {
  return createClient<Database>(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
