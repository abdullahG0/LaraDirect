// RealTdSynnexAdapter: stub only in the demo (spec §4.4).
import type {
  Distributor,
  DistributorProduct,
  ListProductsParams,
  OrderStatusResult,
  PlaceOrderRequest,
  PlaceOrderResult,
  PriceStock,
} from './types';

const NOT_IMPLEMENTED = 'Not implemented — awaiting TD SYNNEX API access';

// MAPPING — confirm each field once Digital Bridge documentation arrives:
//   DistributorProduct.sku            <- ? (TD SYNNEX part number)
//   DistributorProduct.mpn            <- ? (vendor part number)
//   DistributorProduct.ean            <- ?
//   DistributorProduct.costPriceExVat <- ? (customer-specific price; currency GBP?)
//   DistributorProduct.stockQty       <- ? (which warehouse(s)? sum or UK-only?)
//   DistributorProduct.stockStatus    <- derive from qty + ? (discontinued flag / EOL)
//   DistributorProduct.eta            <- ? (next PO arrival date)
//   DistributorProduct.images/specs   <- ? (content feed or separate service?)
//   PlaceOrderRequest.reference       -> ? (customer PO number field)
//   PlaceOrderRequest.idempotencyKey  -> ? (supported natively? else dedupe on PO number)
//   PlaceOrderRequest.shipTo          -> ? (dropship address block)
//   PlaceOrderRequest.blindShipment   -> ? (blank/branded delivery note option)
//   OrderStatusResult.status          <- map TD SYNNEX status codes -> DistributorOrderStatus
//   Shipment.trackingNumber/carrier   <- ?
//   Shipment.lines[].serialNumbers    <- ? (available via API?)
//
// TODO before go-live (spec §19): OAuth token caching/refresh, exponential backoff on
// RATE_LIMIT/NETWORK, request logging to distributor_logs with secrets redacted.

export class RealTdSynnexAdapter implements Distributor {
  readonly name = 'TD SYNNEX (live)';

  private readonly config = {
    baseUrl: process.env.TDS_BASE_URL ?? '',
    clientId: process.env.TDS_CLIENT_ID ?? '',
    clientSecret: process.env.TDS_CLIENT_SECRET ?? '',
    customerNumber: process.env.TDS_CUSTOMER_NUMBER ?? '',
  };

  async listProducts(
    _params: ListProductsParams,
  ): Promise<{ items: DistributorProduct[]; nextCursor?: string }> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getProduct(_sku: string): Promise<DistributorProduct | null> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getPriceStock(_skus: string[]): Promise<PriceStock[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async placeOrder(_req: PlaceOrderRequest): Promise<PlaceOrderResult> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async getOrderStatus(_distributorOrderId: string): Promise<OrderStatusResult> {
    throw new Error(NOT_IMPLEMENTED);
  }
  async cancelOrder(_distributorOrderId: string): Promise<{ cancelled: boolean; reason?: string }> {
    throw new Error(NOT_IMPLEMENTED);
  }
}
