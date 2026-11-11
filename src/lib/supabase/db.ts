// Shared database handle type. Service-layer functions take a `Db` argument instead of creating
// their own client, so the same code runs in route handlers, cron jobs, scripts and tests.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from './types';

export type Db = SupabaseClient<Database>;
export type { Database, Json };

export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];
export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ShipmentRow = Database['public']['Tables']['shipments']['Row'];
export type OrderEventRow = Database['public']['Tables']['order_events']['Row'];

/** Throws a readable error when a Supabase call fails; returns the data otherwise. */
export function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null || res.data === undefined) throw new Error(`${what}: no data`);
  return res.data as NonNullable<T>;
}
