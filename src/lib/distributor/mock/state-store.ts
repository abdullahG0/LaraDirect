// Persistence for mock distributor state (price/stock drift, orders, idempotency keys).
// Spec §4.3 stores this in the `mock_distributor_state` table (SupabaseStateStore). Without Supabase
// credentials a JSON file under .data/ is used locally, and an in-memory store in tests.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface MockStateStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

export class MemoryStateStore implements MockStateStore {
  private data = new Map<string, unknown>();
  async get<T>(key: string) {
    const v = this.data.get(key);
    return v === undefined ? undefined : (structuredClone(v) as T);
  }
  async set<T>(key: string, value: T) {
    this.data.set(key, structuredClone(value));
  }
}

export class FileStateStore implements MockStateStore {
  constructor(private readonly file = path.join(process.cwd(), '.data', 'mock-distributor-state.json')) {}

  private readAll(): Record<string, unknown> {
    try {
      return JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async get<T>(key: string) {
    return this.readAll()[key] as T | undefined;
  }

  async set<T>(key: string, value: T) {
    const all = this.readAll();
    all[key] = value;
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(all));
    renameSync(tmp, this.file);
  }
}

/** Persists each key as one row of `mock_distributor_state`, so drift and orders survive serverless restarts. */
export class SupabaseStateStore implements MockStateStore {
  private readonly db: SupabaseClient;
  constructor(url: string, secretKey: string) {
    this.db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async get<T>(key: string) {
    const { data, error } = await this.db
      .from('mock_distributor_state')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw new Error(`mock state read failed: ${error.message}`);
    return (data?.value ?? undefined) as T | undefined;
  }

  async set<T>(key: string, value: T) {
    const { error } = await this.db
      .from('mock_distributor_state')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(`mock state write failed: ${error.message}`);
  }
}

export function createDefaultStateStore(): MockStateStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (url && key && process.env.MOCK_STATE_STORE !== 'file') return new SupabaseStateStore(url, key);
  return new FileStateStore();
}
