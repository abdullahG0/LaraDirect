import type { DistributorProduct } from '../types';

/** Mock-only metadata stored alongside each catalogue item. Stripped before leaving the adapter. */
export interface MockMeta {
  kind: string; // product silhouette for the image generator
  flags: MockFlag[];
  etaDays?: number; // backorder ETA, relative to "today" so it never goes stale
  bundleFor?: string; // category this accessory is "frequently bought with"
}

export type MockFlag = 'perma-oos' | 'thin-margin' | 'bundle-ready';

export interface MockCatalogueItem extends DistributorProduct {
  mock: MockMeta;
}
