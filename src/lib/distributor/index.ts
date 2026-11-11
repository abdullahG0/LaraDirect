// Factory (spec §4.5). Everything outside lib/distributor imports from here only.
import type { Distributor } from './types';
import { MockTdSynnexAdapter } from './mock-adapter';
import { RealTdSynnexAdapter } from './real-adapter';
import { withLogging, type LogSink } from './logging';

export * from './types';
export { withLogging, redact, type LogEntry, type LogSink } from './logging';

let instance: Distributor | undefined;

export function getDistributor(): Distributor {
  if (!instance) {
    instance =
      process.env.DISTRIBUTOR_MODE === 'real' ? new RealTdSynnexAdapter() : new MockTdSynnexAdapter();
  }
  return instance;
}

export const distributorMode = (): 'mock' | 'real' =>
  process.env.DISTRIBUTOR_MODE === 'real' ? 'real' : 'mock';

/** Mock-only extras (drift, reset, failure controls). Present only when running against the mock. */
export interface MockControls {
  tick(): Promise<{ priceChanges: number; stockChanges: number }>;
  reset(): Promise<void>;
  configure(controls: { failRate?: number | null; rejectSkus?: string[] }): void;
}

export function mockControls(d: Distributor = getDistributor()): MockControls | null {
  const m = d as Partial<MockControls>;
  return typeof m.tick === 'function' && typeof m.configure === 'function' ? (m as MockControls) : null;
}

/** The active adapter, with every call written to `sink` (normally the distributor_logs table). */
export function getLoggedDistributor(sink: LogSink): Distributor {
  return withLogging(getDistributor(), sink);
}

/** Test helper: clears the cached adapter so env changes take effect. */
export function resetDistributorForTests(): void {
  instance = undefined;
}
