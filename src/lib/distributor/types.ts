// Distributor contract (spec §4.2). The service layer depends ONLY on this file + getDistributor().

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued' | 'backorder';

export interface DistributorProduct {
  sku: string; // distributor SKU
  mpn: string; // manufacturer part number
  ean?: string;
  brand: string;
  name: string;
  description: string;
  category: string; // top-level, e.g. "Laptops"
  subcategory?: string; // e.g. "Chromebooks"
  specs: Record<string, string>;
  images: string[]; // relative URLs in the mock
  costPriceExVat: number; // GBP, what LaraDirect pays
  rrpExVat?: number;
  stockQty: number;
  stockStatus: StockStatus;
  eta?: string; // ISO date if backorder
  weightKg?: number;
  warrantyMonths?: number;
  tags?: string[];
  updatedAt: string;
}

export interface PriceStock {
  sku: string;
  costPriceExVat: number;
  stockQty: number;
  stockStatus: StockStatus;
  eta?: string;
  fetchedAt: string;
}

export interface ShipTo {
  name: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: 'GB';
  phone: string;
  email: string;
}

export interface DistributorOrderLine {
  sku: string;
  quantity: number;
  expectedCostExVat: number;
}

export interface PlaceOrderRequest {
  reference: string; // LaraDirect order number, used as PO number; must be unique
  idempotencyKey: string; // same key => same result, never a duplicate order
  lines: DistributorOrderLine[];
  shipTo: ShipTo;
  dropship: true;
  blindShipment: boolean;
  notes?: string;
}

export type DistributorOrderStatus =
  | 'received'
  | 'confirmed'
  | 'backordered'
  | 'partially_shipped'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export interface PlaceOrderResult {
  distributorOrderId: string;
  status: DistributorOrderStatus;
  acceptedAt: string;
  lines: Array<{ sku: string; accepted: number; confirmedCostExVat: number; eta?: string }>;
}

export interface Shipment {
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  shippedAt: string;
  deliveredAt?: string;
  lines: Array<{ sku: string; quantity: number; serialNumbers?: string[] }>;
}

export interface OrderStatusResult {
  distributorOrderId: string;
  status: DistributorOrderStatus;
  updatedAt: string;
  shipments: Shipment[];
  rejectionReason?: string;
}

export interface ListProductsParams {
  cursor?: string;
  limit?: number;
  category?: string;
  updatedSince?: string;
}

export interface Distributor {
  readonly name: string;
  listProducts(params: ListProductsParams): Promise<{ items: DistributorProduct[]; nextCursor?: string }>;
  getProduct(sku: string): Promise<DistributorProduct | null>;
  getPriceStock(skus: string[]): Promise<PriceStock[]>; // batch, live
  placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult>;
  getOrderStatus(distributorOrderId: string): Promise<OrderStatusResult>;
  cancelOrder?(distributorOrderId: string): Promise<{ cancelled: boolean; reason?: string }>;
}

export type DistributorErrorCode =
  'NETWORK' | 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'UNKNOWN';

export class DistributorError extends Error {
  constructor(
    message: string,
    public code: DistributorErrorCode,
    public retryable: boolean,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'DistributorError';
  }
}
