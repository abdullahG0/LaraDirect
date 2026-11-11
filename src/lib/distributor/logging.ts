// Logs every adapter call to `distributor_logs` (spec §6, §14). Secrets and personal contact
// details are redacted; long product lists are summarised so log rows stay small.
import type { Distributor } from './types';
import { DistributorError } from './types';

export interface LogEntry {
  method: string;
  request: unknown;
  response: unknown;
  status: 'ok' | 'error';
  duration_ms: number;
}

export type LogSink = (entry: LogEntry) => Promise<void> | void;

const SECRET_KEYS = /secret|token|password|authorization|api[-_]?key|client[-_]?id/i;
const PII_KEYS = /^(email|phone)$/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    if (value.length > 20)
      return { count: value.length, sample: value.slice(0, 3).map((v) => redact(v, depth + 1)) };
    return value.map((v) => redact(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (SECRET_KEYS.test(k)) out[k] = '[redacted]';
    else if (PII_KEYS.test(k) && typeof v === 'string') out[k] = v ? '[redacted]' : v;
    else out[k] = redact(v, depth + 1);
  }
  return out;
}

function summarise(method: string, result: unknown): unknown {
  if (method === 'listProducts' && result && typeof result === 'object' && 'items' in result) {
    const r = result as { items: { sku: string }[]; nextCursor?: string };
    return { count: r.items.length, nextCursor: r.nextCursor, skus: r.items.slice(0, 5).map((i) => i.sku) };
  }
  if (method === 'getProduct' && result && typeof result === 'object' && 'sku' in result) {
    const r = result as { sku: string; costPriceExVat: number; stockQty: number; stockStatus: string };
    return { sku: r.sku, costPriceExVat: r.costPriceExVat, stockQty: r.stockQty, stockStatus: r.stockStatus };
  }
  return redact(result);
}

const LOGGED = ['listProducts', 'getProduct', 'getPriceStock', 'placeOrder', 'getOrderStatus', 'cancelOrder'];

/** Returns a Distributor that behaves exactly like `inner` but reports each call to `sink`. */
export function withLogging<T extends Distributor>(inner: T, sink: LogSink): T {
  return new Proxy(inner, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || !LOGGED.includes(prop) || typeof value !== 'function') {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return async (...args: unknown[]) => {
        const started = Date.now();
        try {
          const result = await (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
          await safeSink(sink, {
            method: prop,
            request: redact(args.length === 1 ? args[0] : args),
            response: summarise(prop, result),
            status: 'ok',
            duration_ms: Date.now() - started,
          });
          return result;
        } catch (err) {
          await safeSink(sink, {
            method: prop,
            request: redact(args.length === 1 ? args[0] : args),
            response:
              err instanceof DistributorError
                ? {
                    code: err.code,
                    retryable: err.retryable,
                    message: err.message,
                    details: redact(err.details),
                  }
                : { message: (err as Error).message },
            status: 'error',
            duration_ms: Date.now() - started,
          });
          throw err;
        }
      };
    },
  });
}

async function safeSink(sink: LogSink, entry: LogEntry) {
  try {
    await sink(entry);
  } catch (err) {
    console.warn(`distributor log write failed: ${(err as Error).message}`);
  }
}
