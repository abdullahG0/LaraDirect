import { MockTdSynnexAdapter } from '@/lib/distributor/mock-adapter';
import { MemoryStateStore } from '@/lib/distributor/mock/state-store';
import { runDistributorContract } from './distributor.contract';

runDistributorContract(
  'MockTdSynnexAdapter',
  () =>
    new MockTdSynnexAdapter({
      store: new MemoryStateStore(),
      latencyMs: [0, 0],
      failRate: 0,
      rejectSkus: [],
    }),
);
