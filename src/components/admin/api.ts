'use client';

import { toast } from 'sonner';

/** JSON fetch for admin APIs. Throws an Error with the API's message on failure. */
export async function adminFetch<T = unknown>(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  return json as T;
}

/** Runs an admin action with success/error toasts. Returns the result, or null on failure. */
export async function runAction<T>(
  fn: () => Promise<T>,
  messages: { success: string | ((r: T) => string); error?: string },
): Promise<T | null> {
  try {
    const r = await fn();
    toast.success(typeof messages.success === 'function' ? messages.success(r) : messages.success);
    return r;
  } catch (err) {
    toast.error(messages.error ?? 'Action failed', { description: (err as Error).message });
    return null;
  }
}
