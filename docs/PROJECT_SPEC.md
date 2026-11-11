# LaraDirect — Project Specification (Demo Build)

> A custom-built UK dropshipping store for teachers' tech (laptops, iPads, PCs, headphones, accessories), sourced from TD SYNNEX. Orders placed on LaraDirect are forwarded to TD SYNNEX, which ships directly to the customer. LaraDirect earns the margin between TD SYNNEX cost price and its own sell price.

This document is the single source of truth for building the **demo**: a distributor adapter with a mock TD SYNNEX behind it, a mock catalogue, a professional storefront, and an admin dashboard. The real TD SYNNEX API plugs in later by swapping one adapter.

---

## 1. Goals and non-goals

### Goals
1. A demo that looks and feels like a real, trustworthy UK tech store, suitable for showing to schools, stakeholders and TD SYNNEX.
2. A clean **adapter layer** so the storefront and admin never know whether they're talking to the mock or the real TD SYNNEX.
3. A **mock catalogue** of ~200 realistic products with live-looking price and stock changes.
4. A complete **order lifecycle**, from customer checkout to TD SYNNEX submission to shipped and delivered, with realistic failure states.
5. An **admin dashboard** to manage orders, products, pricing rules, stock sync, users and reports.

### Non-goals for the demo
- Real payments (use Stripe **test mode** only).
- Real TD SYNNEX calls (mock only; a stub for the real adapter is included).
- Multi-currency, multi-language, marketplace integrations.
- Returns/RMA automation (TD SYNNEX's After Sales API is marked "Under Construction"; returns are a manual admin workflow in the demo).

### Demo disclaimer
Show a small, unobtrusive "Demo environment — no real orders are taken" banner on every storefront page, switchable via `NEXT_PUBLIC_DEMO_MODE`.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui components (copied into the repo, no runtime CDN) |
| Icons | `lucide-react` (bundled) |
| Fonts | `next/font` self-hosted (Inter for UI, optionally Plus Jakarta Sans for headings) |
| Database + Auth | Supabase (Postgres, Row Level Security, Supabase Auth) |
| Payments | Stripe Checkout in **test mode** |
| Validation | Zod (shared between API routes and forms) |
| Tables / charts | TanStack Table, Recharts |
| Forms | React Hook Form + Zod resolver |
| Background jobs | Supabase `pg_cron` + Next.js route handlers (or Vercel Cron) |
| Email | Resend (demo: log to console and an `outbox` table) |
| Testing | Vitest (unit), Playwright (e2e + screenshots) |

**Rule: zero external CDN dependencies at runtime.** Fonts, icons and all JS are bundled or self-hosted. Product images in the demo are generated locally (see §5.5).

---

## 3. High-level architecture

```
┌──────────────────────┐        ┌──────────────────────────────┐
│  Storefront (Next.js)│        │  Admin Dashboard (Next.js)   │
│  /, /shop, /product  │        │  /admin/*  (role-protected)  │
└──────────┬───────────┘        └──────────────┬───────────────┘
           │                                   │
           └────────────┬──────────────────────┘
                        ▼
              ┌───────────────────┐
              │  Service layer    │  catalogue, pricing, orders, sync
              └────────┬──────────┘
        ┌──────────────┼───────────────────────┐
        ▼              ▼                       ▼
┌───────────────┐ ┌──────────────┐   ┌──────────────────────┐
│ Supabase (PG) │ │ Stripe (test)│   │ Distributor Adapter  │
│ products,     │ │ payments     │   │  interface           │
│ orders, rules │ └──────────────┘   │  ├─ MockTdSynnex ✅  │
└───────────────┘                    │  └─ RealTdSynnex 🔌  │
                                     └──────────────────────┘
```

**Key principle:** the service layer only imports the `Distributor` interface. A single factory (`getDistributor()`) reads `DISTRIBUTOR_MODE=mock|real` and returns the right implementation.

---

## 4. Distributor adapter

### 4.1 Why it exists
TD SYNNEX UK exposes (via its Digital Bridge developer portal) Catalogue and Order Management APIs, plus data feeds, EDI and a legacy XML service. Field names and auth will only be known once access is granted. The adapter isolates all of that.

### 4.2 Interface (`src/lib/distributor/types.ts`)

```ts
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued' | 'backorder';

export interface DistributorProduct {
  sku: string;               // distributor SKU
  mpn: string;               // manufacturer part number
  ean?: string;
  brand: string;
  name: string;
  description: string;
  category: string;          // top-level, e.g. "Laptops"
  subcategory?: string;      // e.g. "Chromebooks"
  specs: Record<string, string>;
  images: string[];          // relative URLs in the mock
  costPriceExVat: number;    // GBP, what LaraDirect pays
  rrpExVat?: number;         // recommended retail price, if provided
  stockQty: number;
  stockStatus: StockStatus;
  eta?: string;              // ISO date if backorder
  weightKg?: number;
  warrantyMonths?: number;
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

export interface DistributorOrderLine { sku: string; quantity: number; expectedCostExVat: number; }

export interface PlaceOrderRequest {
  reference: string;         // LaraDirect order number, used as PO number; must be unique
  idempotencyKey: string;    // same key => same result, never a duplicate order
  lines: DistributorOrderLine[];
  shipTo: ShipTo;
  dropship: true;
  blindShipment: boolean;    // plain/branded delivery note, if supported
  notes?: string;
}

export type DistributorOrderStatus =
  | 'received' | 'confirmed' | 'backordered' | 'partially_shipped'
  | 'shipped' | 'delivered' | 'cancelled' | 'rejected';

export interface PlaceOrderResult {
  distributorOrderId: string;
  status: DistributorOrderStatus;
  acceptedAt: string;
  lines: Array<{ sku: string; accepted: number; confirmedCostExVat: number; eta?: string }>;
}

export interface OrderStatusResult {
  distributorOrderId: string;
  status: DistributorOrderStatus;
  updatedAt: string;
  shipments: Array<{
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
    shippedAt: string;
    deliveredAt?: string;
    lines: Array<{ sku: string; quantity: number; serialNumbers?: string[] }>;
  }>;
  rejectionReason?: string;
}

export interface Distributor {
  readonly name: string;
  listProducts(params: { cursor?: string; limit?: number; category?: string; updatedSince?: string }):
    Promise<{ items: DistributorProduct[]; nextCursor?: string }>;
  getProduct(sku: string): Promise<DistributorProduct | null>;
  getPriceStock(skus: string[]): Promise<PriceStock[]>;   // batch, live
  placeOrder(req: PlaceOrderRequest): Promise<PlaceOrderResult>;
  getOrderStatus(distributorOrderId: string): Promise<OrderStatusResult>;
  cancelOrder?(distributorOrderId: string): Promise<{ cancelled: boolean; reason?: string }>;
}

export class DistributorError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK' | 'AUTH' | 'RATE_LIMIT' | 'VALIDATION' | 'OUT_OF_STOCK' | 'PRICE_CHANGED' | 'UNKNOWN',
    public retryable: boolean,
    public details?: unknown
  ) { super(message); }
}
```

### 4.3 `MockTdSynnexAdapter` behaviour
- Reads the catalogue from `data/mock-catalogue.json` (loaded into memory, with price and stock overrides held in a `mock_distributor_state` table so changes persist).
- **Latency:** random 150–600 ms per call to feel real.
- **Price drift:** a `tick()` function (called by the sync job) nudges ~5% of products by ±0.5–3% cost price per run.
- **Stock drift:** ~15% of products change quantity per tick; a few go out of stock or come back.
- **Order handling in `placeOrder`:**
  - Idempotent on `idempotencyKey`.
  - Validates stock and price. If current cost differs from `expectedCostExVat` by more than a configured tolerance, throw `PRICE_CHANGED` (retryable after refresh).
  - If any line is out of stock, throw `OUT_OF_STOCK` (non-retryable), or accept as `backordered` for products flagged `backorder`.
  - Failure injection controlled by env vars: `MOCK_FAIL_RATE` (e.g. 0.05 random network failures) and `MOCK_REJECT_SKUS` (comma list that always reject), so the dashboard's failed-order handling can be demonstrated.
- **Order progression** is time-based and computed lazily in `getOrderStatus` from the order's creation time (so it works on serverless without timers):
  - 0–2 min: `received` → 2–10 min: `confirmed` → 10–60 min: shipped (generates tracking) → 1–3 hours: `delivered`.
  - A `DEMO_TIME_SCALE` env var (default `1`; set `60` to make a day pass in ~24 minutes) speeds this up for live demos.
- Generates fake carriers (DPD, Royal Mail, DHL, UPS), tracking numbers, and serial numbers for laptops/iPads.

### 4.4 `RealTdSynnexAdapter` (stub only in demo)
- Implements the same interface; every method throws `new Error('Not implemented — awaiting TD SYNNEX API access')`.
- Contains a `// MAPPING` section listing each field to confirm once documentation arrives.
- Reads `TDS_BASE_URL`, `TDS_CLIENT_ID`, `TDS_CLIENT_SECRET`, `TDS_CUSTOMER_NUMBER` from env.
- Must add: token caching/refresh, retry with exponential backoff on `RATE_LIMIT`/`NETWORK`, request logging to `distributor_logs`.

### 4.5 Factory
```ts
export function getDistributor(): Distributor {
  return process.env.DISTRIBUTOR_MODE === 'real' ? new RealTdSynnexAdapter() : new MockTdSynnexAdapter();
}
```

### 4.6 Adapter tests
A shared **contract test suite** runs against any `Distributor` implementation (pass today for mock; run against the real one in the sandbox later). It checks pagination, idempotency, error codes, status transitions and field presence.

---

## 5. Mock catalogue

### 5.1 Size and categories (~200 products)

| Category | Subcategories | Approx. count |
|---|---|---|
| Laptops | Windows laptops, Chromebooks, MacBooks, Rugged/education | 40 |
| Tablets | iPads, Android tablets, tablet cases and keyboards | 30 |
| Desktops & All-in-ones | Mini PCs, Tower PCs, All-in-ones, iMac | 20 |
| Monitors & Displays | 24"–34" monitors, portable monitors, interactive displays | 20 |
| Headphones & Audio | USB/over-ear classroom headsets, wireless, earbuds, speakers, conference mics | 30 |
| Peripherals | Keyboards, mice, webcams, document cameras, presenters/clickers | 25 |
| Networking & Power | Docks, hubs, chargers, cables, Wi-Fi, charging trolleys | 20 |
| Software & Accessories | Bags and sleeves, stands, screen protectors, Office/Windows licences | 15 |

**Teacher focus:** weight the catalogue towards classroom and school use. Chromebooks, durable laptops, USB headsets with boom mics, document cameras, presenters, iPads with cases, interactive displays, laptop bags, charging trolleys, webcams.

### 5.2 Brands to use (names only, as real brand labels in demo data)
Apple, Lenovo, HP, Dell, Acer, ASUS, Microsoft, Samsung, Logitech, Jabra, Sennheiser, Poly, Sony, Bose, JBL, Anker, Belkin, AOC, Philips, Targus, Kensington, Epson, TP-Link, Ubiquiti, Lenovo ThinkPad series.

> Use plausible but clearly **demo** model names/specs. Don't copy manufacturer marketing text or official product photos; descriptions should be short, original, spec-led copy.

### 5.3 Product record fields
`sku` (e.g. `TDS-LEN-7421903`), `mpn`, `ean`, `brand`, `name`, `description` (50–90 words, original), `category`, `subcategory`, `specs` (key/value, category-appropriate: e.g. CPU, RAM, Storage, Screen, Battery, OS, Ports, Weight for laptops), `images` (1–4), `costPriceExVat`, `rrpExVat`, `stockQty`, `stockStatus`, `weightKg`, `warrantyMonths`, optional `eta`, `tags` (e.g. `education`, `chromebook`, `usb-headset`).

### 5.4 Realistic price bands (cost, ex-VAT, GBP)
| Product type | Cost range |
|---|---|
| Chromebook | £140–£320 |
| Windows laptop (school/business) | £340–£1,100 |
| MacBook | £850–£2,100 |
| iPad (standard / Air / Pro) | £290 / £480 / £800+ |
| Mini PC / desktop | £260–£950 |
| Monitor | £95–£420 |
| USB headset | £14–£70 |
| Premium wireless headphones | £70–£290 |
| Webcam / peripherals | £9–£140 |
| Accessories | £3–£60 |

Distributor margins are thin on big-brand hardware. Seed `rrpExVat` so that default retail markups give realistic margins (see §7): ~3–6% on Apple/laptops, ~8–15% on monitors/peripherals, ~20–40% on accessories and audio.

### 5.5 Images
Generate local placeholder images at build time (no external image hosting):
- A script `scripts/generate-product-images.ts` renders clean SVG/WebP product-style cards (soft gradient background by category, product-type silhouette, brand name, model text).
- Store in `/public/products/<sku>-<n>.webp`.
- Optionally allow the owner to drop real images in the same folder with matching filenames; the app picks them up automatically.

### 5.6 Seed generation
`scripts/generate-mock-catalogue.ts` produces `data/mock-catalogue.json` from templates (brand × series × spec variations) using a seeded random number generator, so the catalogue is **deterministic**. The same seed gives the same products every run. Include a handful of intentional edge cases:
- 5 products permanently out of stock
- 5 low stock (qty 1–3)
- 3 backorder with ETA
- 2 discontinued
- 3 products with very thin margin (to test the margin floor)
- 2 bundles-ready accessories (for "frequently bought together")

---

## 6. Data model (Supabase / Postgres)

```sql
-- Enums
create type order_status as enum (
  'pending_payment','paid','submitting','submitted','confirmed','backordered',
  'partially_shipped','shipped','delivered','failed','cancelled','refunded'
);
create type stock_status as enum ('in_stock','low_stock','out_of_stock','discontinued','backorder');
create type user_role as enum ('owner','admin','support','viewer');

-- Catalogue (mirror of distributor data + LaraDirect overrides)
create table products (
  id uuid primary key default gen_random_uuid(),
  distributor_sku text unique not null,
  mpn text, ean text,
  brand text not null, name text not null, slug text unique not null,
  description text, category text not null, subcategory text,
  specs jsonb default '{}',
  images text[] default '{}',
  cost_price_ex_vat numeric(10,2) not null,
  rrp_ex_vat numeric(10,2),
  stock_qty int not null default 0,
  stock_status stock_status not null default 'in_stock',
  eta date,
  weight_kg numeric(6,2), warranty_months int,
  tags text[] default '{}',
  -- LaraDirect overrides
  is_published boolean default true,
  price_override_inc_vat numeric(10,2),     -- manual fixed price if set
  title_override text, description_override text,
  featured boolean default false,
  -- computed by pricing engine
  sell_price_ex_vat numeric(10,2),
  sell_price_inc_vat numeric(10,2),
  margin_pct numeric(5,2),
  last_synced_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on products (category, is_published);
create index on products using gin (to_tsvector('english', brand || ' ' || name));

-- Pricing
create table pricing_rules (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','category','brand','sku')),
  scope_value text,                          -- e.g. 'Laptops', 'Apple', a SKU; null for global
  markup_type text not null check (markup_type in ('percent','fixed')),
  markup_value numeric(8,2) not null,
  min_margin_pct numeric(5,2) default 0,     -- floor
  min_margin_amount numeric(8,2) default 0,  -- floor in GBP
  rounding text default 'x.99' check (rounding in ('none','x.99','x.95','nearest_1')),
  priority int default 0, is_active boolean default true,
  created_by uuid, created_at timestamptz default now()
);
create table price_history (
  id bigserial primary key, product_id uuid references products,
  cost_price_ex_vat numeric(10,2), sell_price_inc_vat numeric(10,2),
  reason text, changed_at timestamptz default now(), changed_by uuid
);

-- Customers & orders
create table customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users, email text not null, full_name text, phone text,
  organisation text, created_at timestamptz default now()
);
create table addresses (
  id uuid primary key default gen_random_uuid(), customer_id uuid references customers,
  name text, line1 text, line2 text, city text, postcode text, country text default 'GB', phone text,
  is_default boolean default false
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,              -- e.g. LD-100042
  customer_id uuid references customers,
  email text not null,
  status order_status not null default 'pending_payment',
  ship_to jsonb not null, bill_to jsonb,
  subtotal_inc_vat numeric(10,2), shipping_inc_vat numeric(10,2) default 0,
  vat_total numeric(10,2), total_inc_vat numeric(10,2),
  cost_total_ex_vat numeric(10,2),                -- what we owe TD SYNNEX
  gross_profit numeric(10,2),
  stripe_payment_intent text, paid_at timestamptz,
  distributor_order_id text, distributor_status text,
  distributor_idempotency_key text unique,
  submit_attempts int default 0, last_error text,
  school_po_number text,                          -- optional, for school buyers
  notes text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid references orders on delete cascade,
  product_id uuid references products, distributor_sku text, name text,
  quantity int, unit_price_inc_vat numeric(10,2), unit_cost_ex_vat numeric(10,2),
  serial_numbers text[] default '{}'
);
create table shipments (
  id uuid primary key default gen_random_uuid(), order_id uuid references orders on delete cascade,
  carrier text, tracking_number text, tracking_url text,
  shipped_at timestamptz, delivered_at timestamptz
);
create table order_events (                      -- audit trail / timeline
  id bigserial primary key, order_id uuid references orders on delete cascade,
  type text, message text, data jsonb, actor text, created_at timestamptz default now()
);

-- Ops
create table sync_runs (
  id uuid primary key default gen_random_uuid(), started_at timestamptz default now(), finished_at timestamptz,
  type text, products_seen int, products_changed int, price_changes int, stock_changes int, errors int, log text
);
create table distributor_logs (                  -- every adapter call (redact secrets)
  id bigserial primary key, method text, request jsonb, response jsonb,
  status text, duration_ms int, created_at timestamptz default now()
);
create table mock_distributor_state (            -- persists mock price/stock drift & mock orders
  key text primary key, value jsonb, updated_at timestamptz default now()
);
create table admin_users (
  user_id uuid primary key references auth.users, role user_role not null default 'viewer', name text
);
create table audit_log (
  id bigserial primary key, actor uuid, action text, entity text, entity_id text,
  before jsonb, after jsonb, created_at timestamptz default now()
);
create table settings (key text primary key, value jsonb);   -- vat rate, free shipping threshold, etc.
```

**RLS:** public can `select` published products (via a view that hides cost price!). Orders readable only by their customer or admin roles. Cost price and margin columns must **never** be exposed to storefront queries; use a `public_products` view/RPC for the storefront.

---

## 7. Pricing engine

### 7.1 Formula
```
rule      = most specific active rule (sku > brand > category > global), then highest priority
markup    = percent ? cost × (markup_value/100) : markup_value
sell_ex   = cost + markup
floor_ex  = max(cost × (1 + min_margin_pct/100), cost + min_margin_amount)
sell_ex   = max(sell_ex, floor_ex)
sell_inc  = sell_ex × (1 + VAT)        // VAT = 20% from settings
sell_inc  = apply rounding rule (e.g. x.99)
if product.price_override_inc_vat → use that instead (still show margin warning if below floor)
margin_pct = (sell_ex − cost) / sell_ex
```
Note: margin is calculated on the **ex-VAT** price after rounding is back-computed, so VAT never counts as profit.

### 7.2 Default rules (seed)
| Scope | Markup | Min margin |
|---|---|---|
| Global | 8% | 3% |
| Laptops / Tablets / Desktops | 5% | 3% |
| Apple brand | 3% | 2% |
| Monitors | 10% | 5% |
| Headphones & Audio | 18% | 10% |
| Peripherals | 15% | 8% |
| Networking & Power / Accessories | 30% | 15% |

### 7.3 Behaviour
- Recalculate on every sync that changes a cost price, and when a rule is edited (with an "apply now" confirmation and preview).
- Every recalculation writes `price_history`.
- **Alerts:** flag any product where margin falls below its floor or goes negative after a cost increase; show in the admin dashboard's "Needs attention".
- **Price protection at checkout:** at order time, re-fetch live cost via `getPriceStock`. If cost has risen so the margin would drop below the floor, show an admin alert (the order still proceeds in demo mode; in production, configurable: hold for review).

---

## 8. Order lifecycle

```
pending_payment ──(Stripe webhook: paid)──► paid
paid ──► submitting ──(adapter.placeOrder OK)──► submitted ──► confirmed
                 │                                         ├─► backordered ─► confirmed
                 └─(error)──► failed ──(admin retry)──► submitting
confirmed ──► partially_shipped ──► shipped ──► delivered
any pre-shipped state ──(admin cancel + adapter.cancelOrder)──► cancelled ──► refunded
```

### 8.1 Step by step
1. **Checkout** creates the order as `pending_payment` and a Stripe Checkout session (test mode).
2. **Stripe webhook** (`checkout.session.completed`) marks the order `paid`, writes an `order_events` row, and enqueues submission.
3. **Submission job** (`submitOrder(orderId)`):
   - Re-checks live price and stock via the adapter.
   - Builds `PlaceOrderRequest` with `reference = order_number` and `idempotencyKey = order.id`.
   - On success: store `distributor_order_id`, set `submitted`.
   - On retryable error: retry with backoff (1 min, 5 min, 15 min, max 5 attempts).
   - On non-retryable error: set `failed`, store `last_error`, notify admins.
4. **Status poller** (cron every 5 min; faster in demo): for all open orders call `getOrderStatus`, update status, create `shipments` rows, store serial numbers, email the customer on `shipped` (with tracking) and `delivered`.
5. **Admin actions:** retry submission, cancel (calls adapter if possible and flags a manual refund), add note, resend emails, mark as refunded.

### 8.2 Customer-facing statuses (friendlier)
Order received → Preparing your order → Dispatched → Delivered; with "Delayed (awaiting stock)" for backordered and "Problem with your order — we're on it" for failed.

---

## 9. Sync job

`syncCatalogue()` runs on a schedule (every 15 min in demo; configurable):
1. `listProducts({ updatedSince: lastRun })` → upsert into `products` (keep LaraDirect overrides intact).
2. `getPriceStock(skuBatch)` in batches of 50 for published products.
3. Detect price/stock changes → update rows, write `price_history`, recalc sell price.
4. Mark products missing from the feed as `discontinued` and unpublish after a grace period.
5. Write a `sync_runs` row with counts and errors.

Admin can trigger "Sync now" and "Sync one product".

In mock mode, `tick()` is invoked first so each sync shows realistic changes.

---

## 10. Storefront

### 10.1 Pages
| Route | Purpose |
|---|---|
| `/` | Home: hero, "Shop for teachers" categories, featured products, back-to-school deals, trust bar, newsletter |
| `/shop` | All products with filters and sorting |
| `/c/[category]` (+ `/c/[category]/[sub]`) | Category listing with category-specific filters |
| `/p/[slug]` | Product detail page |
| `/search?q=` | Search results with instant suggestions in the header |
| `/basket` | Basket page (also a slide-out mini basket) |
| `/checkout` | Single-page checkout: contact, delivery, review, pay |
| `/order/[orderNumber]` | Order confirmation + tracking page (secure via email + token) |
| `/account` | Orders, addresses, details (Supabase Auth, optional guest checkout) |
| `/deals` | Special offers |
| `/education` | Landing page for schools and teachers: school POs, bulk quotes, contact form |
| `/about`, `/contact`, `/delivery`, `/returns`, `/warranty`, `/privacy`, `/terms`, `/cookies` | Content pages |

### 10.2 Product listing
- Responsive grid (2 columns mobile, 3 tablet, 4 desktop), with list/grid toggle.
- Product card: image, brand, name, key spec line (e.g. "14″ · 8 GB · 256 GB"), price inc. VAT with "ex. VAT" in small text, stock badge, quick-add button, wishlist heart (local storage in demo).
- **Filters (sidebar on desktop, drawer on mobile):** brand, price range slider, availability, category-specific facets (for laptops: screen size, RAM, storage, OS, processor family; headphones: wired/wireless, connection type, mic; tablets: screen size, storage, cellular), "Education suitable" tag.
- **Sorting:** Recommended, Price low→high, Price high→low, Newest, Best sellers (mock).
- Pagination with page numbers (URL-driven, shareable), result count, active filter chips with "clear all".
- Skeleton loaders; empty state with suggestions.

### 10.3 Product detail page
- Image gallery with thumbnails and zoom.
- Title, brand, MPN, price inc. VAT (and ex. VAT toggle for schools), stock status ("In stock — dispatched within 1–2 working days", "Only 3 left", "Expected 24 Nov"), quantity selector, **Add to basket**, "Add to quote" for bulk.
- Delivery estimate, warranty badge, returns summary.
- Tabs: Overview, Specifications (table), Delivery & returns, Reviews (mock data, clearly sample).
- "Frequently bought together" (e.g. laptop + bag + mouse; headset + USB adapter) and "Similar products".
- Sticky add-to-basket bar on mobile.
- Structured data (JSON-LD Product), OpenGraph tags.

### 10.4 Basket and checkout
- Mini-basket drawer with line totals, free-delivery progress bar, VAT breakdown.
- Basket page with quantity editing, remove, promo code field (demo codes like `TEACHER10`), delivery estimate.
- Checkout: guest or account, UK address with postcode lookup placeholder (manual entry in demo), delivery method (Standard, Next-day; flat rates from settings), optional school PO number and "Delivering to a school" checkbox (with school name), order summary, Stripe Checkout (test mode) with clear **test card** hint in demo mode.
- Order confirmation with order number, timeline, and email preview.

### 10.5 Order tracking page
Visual timeline (Received → Preparing → Dispatched → Delivered), carrier name, tracking link, item list, serial numbers on delivered laptops/iPads, help/contact button.

### 10.6 Other storefront features
- Header: logo, search with instant results (debounced), account, basket count, category mega-menu; top bar with delivery/returns/phone.
- Footer: link columns, payment icons, trust badges, newsletter, company details placeholder (registered name, number, VAT).
- Cookie consent banner (essential-only by default; no analytics in demo).
- Dark mode is **not required** for the storefront.
- SEO: dynamic metadata, sitemap.xml, robots.txt, canonical URLs, clean slugs.
- Accessibility: WCAG 2.1 AA target. Keyboard navigable, visible focus rings, alt text, correct heading order, colour contrast ≥ 4.5:1, labelled form fields, `aria-live` for cart updates.
- Performance: `next/image`, route-level code splitting, ISR or cached queries for catalogue pages, Lighthouse ≥ 90 on mobile for the home and product pages.

---

## 11. Admin dashboard (`/admin`)

Role-based access (Supabase Auth + `admin_users`). Roles:
- **owner:** everything, including users and settings
- **admin:** orders, products, pricing, sync
- **support:** view and manage orders and customers, no pricing edits
- **viewer:** read-only reports

### 11.1 Pages and functions

**Dashboard (`/admin`)**
- KPI cards: orders today / 7 days / 30 days, revenue, gross profit, average margin, orders needing attention.
- Charts: revenue and profit over time, orders by status, top categories, top products.
- "Needs attention" panel: failed submissions, backordered orders, below-floor margins, products out of stock that are in baskets, sync errors.
- Recent activity feed.

**Orders (`/admin/orders`, `/admin/orders/[id]`)**
- Table with search (order no., email, name), filters (status, date range, has-issue), sortable columns, pagination, CSV export, bulk actions.
- Order detail: customer and addresses, line items with cost, sell price and profit per line, payment info, TD SYNNEX order ID and status, shipments with tracking, serial numbers, full **event timeline**, internal notes.
- Actions: retry submission, cancel order, mark refunded, resend customer email, edit shipping address (before submission only), add note, refresh status now.
- Failed-order banner with reason and one-click retry.

**Products (`/admin/products`, `/admin/products/[id]`)**
- Table: image, name, SKU, brand, category, cost, sell price, margin %, stock, status, published. Inline price override editing, publish/unpublish toggles, bulk actions (publish, unpublish, apply markup, set featured).
- Filters: category, brand, stock status, margin below floor, unpublished, price overridden.
- Detail page: distributor data (read-only), LaraDirect overrides (title, description, images, price), price history chart, margin calculator, "sync this product now".

**Pricing (`/admin/pricing`)**
- Rules list and editor (scope, markup, floor, rounding, priority, active toggle).
- **Preview impact** before applying: shows the number of products affected, average margin before/after and the biggest changes.
- Simulation of a sample product's price build-up (cost → markup → VAT → rounding).
- Price change history log.

**Stock and sync (`/admin/sync`)**
- Sync run history with counts and errors, "Sync now", per-category sync, status of the distributor connection (mock/real), last successful sync, adapter call log viewer.

**Customers (`/admin/customers`)**
- List with order count and lifetime value, detail with order history and notes.

**Reports (`/admin/reports`)**
- Sales and profit by day/week/month, by category, brand and product; margin distribution; export to CSV.

**Returns (`/admin/returns`)** *(manual workflow in demo)*
- Log a return request against an order, status steps (requested → authorised → received → refunded), notes, and link to TD SYNNEX RMA reference field.

**Settings (`/admin/settings`)**
- VAT rate, shipping rates and free-delivery threshold, promo codes, company details, email templates, feature flags (demo banner, blind shipment toggle), distributor mode display, mock failure-injection controls (demo only).

**Users (`/admin/users`)** *(owner only)*
- Invite admins, change roles, deactivate.

**Audit log (`/admin/audit`)**
- Every price/rule/setting/order action with who, when, before and after.

### 11.2 Admin UX
- Left sidebar (collapsible), top bar with global search (orders, products, customers) via `⌘K` command palette.
- Dense but readable tables (TanStack Table), sticky headers, column visibility, saved filters.
- Toasts for success/error, confirmation dialogs for destructive actions.
- Light and dark mode.
- Fully responsive down to tablet; usable on mobile for order checks.

---

## 12. Design system (professional, user-friendly)

### 12.1 Brand direction
Trustworthy, modern, education-friendly. Clean white space, confident typography, restrained colour, no clutter. Not a "cheap tech shop" look.

### 12.2 Palette (CSS variables / Tailwind tokens)
| Token | Hex | Use |
|---|---|---|
| `brand-900` | `#0B1F3A` | Deep navy: header, footer, headings |
| `brand-600` | `#1D4ED8` | Primary actions, links |
| `accent-500` | `#14B8A6` | Teal accent: highlights, success, badges |
| `warn-500` | `#F59E0B` | Low stock, warnings |
| `danger-500` | `#DC2626` | Errors, out of stock |
| `ink-900` / `ink-600` / `ink-400` | `#0F172A` / `#475569` / `#94A3B8` | Text levels |
| `surface` / `surface-alt` / `border` | `#FFFFFF` / `#F8FAFC` / `#E2E8F0` | Backgrounds and lines |

(Swap for the Lara IT / LaraDirect brand colours if a brand kit exists. Keep contrast ≥ 4.5:1.)

### 12.3 Typography
Inter (UI/body) + Plus Jakarta Sans (headings, optional). Scale: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48. Body 16px, line-height 1.6. Prices in tabular numbers (`font-variant-numeric: tabular-nums`).

### 12.4 Layout and components
- 12-column grid, max content width 1280px, 8px spacing scale, `rounded-xl` cards, subtle shadows, 1px borders.
- Components: Button (primary/secondary/ghost/destructive, loading state), Input, Select, Checkbox, Radio, Slider, Badge, Card, Tabs, Accordion, Dialog, Drawer, Dropdown, Toast, Tooltip, Skeleton, Breadcrumbs, Pagination, Table, Stepper, Timeline, Empty state, Command palette.
- Micro-interactions: hover lift on cards, smooth drawer transitions (≤200 ms), button press feedback; respect `prefers-reduced-motion`.
- Imagery: consistent product image aspect ratio (1:1, contained on white), subtle category illustrations, lifestyle placeholders for hero (generated locally).

### 12.5 Content tone
Plain British English, short and reassuring ("Free delivery over £100", "Dispatched in 1–2 working days"). No jargon in the storefront.

---

## 13. API routes (Next.js route handlers)

**Public**
- `GET /api/products` (filters, sort, pagination) · `GET /api/products/[slug]` · `GET /api/search/suggest?q=`
- `POST /api/checkout` (create order and Stripe session) · `GET /api/orders/[orderNumber]?token=`
- `POST /api/webhooks/stripe`

**Admin** (all require admin role)
- `GET/PATCH /api/admin/orders`, `POST /api/admin/orders/[id]/retry|cancel|refresh|note|resend`
- `GET/PATCH /api/admin/products`, `POST /api/admin/products/bulk`
- `GET/POST/PATCH/DELETE /api/admin/pricing-rules`, `POST /api/admin/pricing-rules/preview`, `POST /api/admin/pricing/recalculate`
- `POST /api/admin/sync`, `GET /api/admin/sync/runs`
- `GET /api/admin/reports/*`, `GET /api/admin/audit`

**Cron (secured with `CRON_SECRET`)**
- `POST /api/cron/sync` · `POST /api/cron/poll-orders` · `POST /api/cron/retry-submissions`

All inputs validated with Zod. Return consistent error shape `{ error: { code, message } }`.

---

## 14. Security and compliance

- **Never expose cost price, margin or distributor IDs to the storefront** (RLS plus a public view).
- Service-role Supabase key used server-side only. Secrets in env vars. Redact secrets in `distributor_logs`.
- Admin routes guarded in middleware and again in each handler. CSRF protection on mutating routes, rate limiting on checkout and auth.
- Stripe webhook signature verification; idempotent webhook handling.
- Input sanitisation and output escaping; strict Content-Security-Policy (self-hosted assets make this easy).
- Audit log for all admin changes.
- **UK/GDPR:** privacy policy, cookie consent, data export and deletion route for customers, minimal data retention.
- **UK consumer law (for launch, confirm with an adviser):** clear total price including VAT and delivery, 14-day cancellation for distance sales, statutory rights for faulty goods, accurate stock/delivery claims, company details in footer. Since LaraDirect is the seller, refunds and faulty-goods claims are LaraDirect's responsibility even though TD SYNNEX ships the goods.
- VAT: trade prices from TD SYNNEX are ex-VAT; display inc-VAT to consumers, with an ex-VAT toggle for schools.

---

## 15. Suggested folder structure

```
laradirect/
├─ src/
│  ├─ app/
│  │  ├─ (store)/            # storefront routes
│  │  ├─ admin/              # admin routes
│  │  └─ api/                # route handlers
│  ├─ components/
│  │  ├─ ui/                 # shadcn primitives
│  │  ├─ store/              # ProductCard, Filters, MiniBasket, Header, Footer...
│  │  └─ admin/              # DataTable, KpiCard, OrderTimeline, RuleEditor...
│  ├─ lib/
│  │  ├─ distributor/        # types.ts, mock-adapter.ts, real-adapter.ts, index.ts
│  │  ├─ pricing/            # engine.ts, rules.ts
│  │  ├─ orders/             # lifecycle.ts, submit.ts, poll.ts
│  │  ├─ sync/               # catalogue-sync.ts
│  │  ├─ supabase/           # client.ts, server.ts, types.ts
│  │  └─ utils/              # money.ts, slug.ts, vat.ts
│  └─ styles/
├─ data/mock-catalogue.json
├─ scripts/                  # generate-mock-catalogue.ts, generate-product-images.ts, seed.ts
├─ supabase/migrations/      # SQL from §6
├─ tests/                    # unit, contract, e2e
├─ public/products/
├─ .env.example
└─ README.md
```

---

## 16. Environment variables (`.env.example`)

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
RESEND_API_KEY=
CRON_SECRET=
DISTRIBUTOR_MODE=mock            # mock | real
DEMO_TIME_SCALE=1                # 60 = fast-forward order progress
MOCK_FAIL_RATE=0.03
MOCK_REJECT_SKUS=
TDS_BASE_URL=
TDS_CLIENT_ID=
TDS_CLIENT_SECRET=
TDS_CUSTOMER_NUMBER=
VAT_RATE=0.20
```

---

## 17. Build plan (in order)

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | Repo, Next.js, Tailwind, shadcn, Supabase project, CI, lint/format | App runs, DB migrates, CI green |
| 1 | Adapter interface, mock adapter, contract tests, catalogue + image generators | `getDistributor()` returns data; contract tests pass |
| 2 | DB schema, seed script, sync job, pricing engine with unit tests | Seeded DB with ~200 priced products; sync produces changes |
| 3 | Storefront: layout, home, listing with filters, product page, search | Browse, filter and search work on mobile and desktop |
| 4 | Basket, checkout, Stripe test payments, webhook, order confirmation | Test purchase creates a paid order |
| 5 | Order lifecycle: submission job, poller, status mapping, emails, tracking page | Order goes paid → delivered automatically; failures retry |
| 6 | Admin: auth/roles, dashboard, orders, products, pricing, sync | All admin functions in §11 working for the demo |
| 7 | Reports, returns, customers, settings, audit log, users | Complete admin |
| 8 | Polish: a11y pass, performance, empty/error states, SEO, content pages, demo data/script | Lighthouse and axe checks pass |
| 9 | E2E tests and screenshot set; README and demo walkthrough | Playwright suite green |

---

## 18. Acceptance criteria (demo is "done" when…)

1. Switching `DISTRIBUTOR_MODE` between `mock` and `real` requires **no changes** outside `lib/distributor`.
2. ~200 products render with consistent images, specs and VAT-inclusive prices; filters and search respond in under 300 ms (local).
3. A test customer can buy a laptop and headset, pay with a Stripe test card, and watch the order progress to delivered (with `DEMO_TIME_SCALE=60` in about 25 minutes), with emails logged and a tracking page that updates.
4. Failure injection produces a `failed` order that an admin can retry successfully from the dashboard.
5. Editing a pricing rule shows an impact preview, applies new prices, and writes price history and audit entries.
6. Cost price and margin are **never** visible in any storefront response or page source (verified by test).
7. Admin roles restrict access correctly (support can't edit pricing; viewer can't mutate anything).
8. Storefront scores ≥ 90 mobile Lighthouse on home and product pages; no critical axe-core violations.
9. Visual QA: Playwright screenshots at 375, 768 and 1440 px for key pages show no overflow or broken layouts.
10. No runtime requests to third-party CDNs (verified in Playwright network log), other than Stripe's own test checkout.

---

## 19. Going live: swap-in checklist

**Ask TD SYNNEX (account manager and the EU API support team):**
- [ ] Digital Bridge developer access, sandbox keys, and API documentation (Catalogue, Order Management).
- [ ] Is dropship to end-customer addresses enabled on our account? Any minimum order value or per-drop carriage charge?
- [ ] Can delivery notes be blank or branded as LaraDirect (blind shipment)?
- [ ] Real-time price/stock: is there an API call, or only the daily data feed? Rate limits?
- [ ] Do product records include images, specs and EANs, or do we need a content feed/service?
- [ ] How are returns/RMAs handled while the After Sales API is unavailable? Who pays return carriage?
- [ ] Delivery notes and serial numbers: available via API?
- [ ] Contract terms for reselling to consumers and to schools; credit limit and payment terms.

**Engineering:**
- [ ] Fill in `RealTdSynnexAdapter` using the confirmed field mapping and run the contract tests against the sandbox.
- [ ] Add token handling, retries, structured logging and alerting.
- [ ] Replace Stripe test keys with live keys; set up real email domain (SPF/DKIM).
- [ ] Legal pages reviewed; company details, VAT number and ICO registration in place.
- [ ] Load test checkout and sync; set up error monitoring (e.g. Sentry) and backups.

---

## 20. Open decisions (confirm before or during build)

1. Final brand colours and logo for LaraDirect (placeholder palette in §12.2 until confirmed).
2. Hosting target (Vercel + Supabase is assumed).
3. Whether schools get ex-VAT pricing and "pay by PO/invoice" in v1, or card-only for the demo.
4. Free delivery threshold and delivery rates (placeholders: free over £100; Standard £4.99; Next-day £9.99).
5. Whether Apple products are sold at all, given their very thin distributor margins.
