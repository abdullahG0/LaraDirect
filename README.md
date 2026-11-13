# LaraDirect (demo build)

UK dropshipping store for teachers' tech. Products come from TD SYNNEX, which ships direct to the customer. This demo runs against a **mock** TD SYNNEX; the real API plugs in later by swapping one adapter.

- Spec: [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)
- Step-by-step build plan: [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md)
- Demo walkthrough: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

## Quick start

Needs Node 20+ and a Supabase project (hosted, or `npx supabase start` with Docker).

```bash
npm install
npx playwright install chromium          # only for e2e tests
cp .env.example .env.local               # fill in Supabase keys; Stripe is optional (see below)
npm run db:migrate                       # applies supabase/migrations (first time on an existing DB: npm run db:migrate -- --baseline 0003)
npm run db:types                         # regenerate TypeScript types from the database
npm run gen:catalogue && npm run gen:images
npm run db:seed                          # ~200 priced products, 4 demo admin users, ~60 sample orders
npm run dev                              # http://localhost:3000
```

Health check: `GET /api/health` shows which distributor adapter is active.

### Demo logins

`npm run db:seed` creates one admin user per role. Password for all: `LaraDemo!2026`. The login page at `/admin/login` has one-click buttons for them in demo mode.

| Email                     | Role    | Can do                                    |
| ------------------------- | ------- | ----------------------------------------- |
| `owner@laradirect.demo`   | owner   | Everything, including users and settings  |
| `admin@laradirect.demo`   | admin   | Orders, products, pricing, sync           |
| `support@laradirect.demo` | support | Orders, customers, returns; no pricing    |
| `viewer@laradirect.demo`  | viewer  | Read-only                                 |

### Payments

- **No Stripe keys** (the `.env.example` placeholders): checkout simulates payment in demo mode, so the order goes straight to `paid` and on to TD SYNNEX.
- **Stripe test keys**: checkout redirects to Stripe Checkout. Pay with `4242 4242 4242 4242`, any future date, any CVC. The order page confirms payment on return, so `stripe listen` is optional. For webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the printed `whsec_…` in `STRIPE_WEBHOOK_SECRET`.

### Background jobs

| Route                              | What it does                                         | Intended schedule        |
| ---------------------------------- | ---------------------------------------------------- | ------------------------ |
| `POST /api/cron/sync`              | Catalogue sync; mock drift first                     | every 15 min             |
| `POST /api/cron/poll-orders`       | Status of open orders, shipments, emails             | every 5 min              |
| `POST /api/cron/retry-submissions` | Submit paid orders, retry failed attempts (backoff)  | every minute             |

All need `Authorization: Bearer $CRON_SECRET`. Locally you don't need cron: the order page refreshes its own order every 15 seconds, and admins have “Sync now” and “Refresh status”. Vercel Hobby only allows daily crons, so the demo deployment has no `crons` in `vercel.json`; for production, add them back on Vercel Pro (`{ "path": "/api/cron/sync", "schedule": "*/15 * * * *" }` etc.), or use `pg_cron` calling these URLs.

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync
```

## Layout

```
src/app/(store)/      storefront routes (shop, product, basket, checkout, order tracking, account, content pages)
src/app/admin/        admin dashboard: login + (panel)/ role-protected pages
src/app/api/          route handlers (public, account, admin, cron, webhooks)
src/components/       ui/ (shadcn), store/, admin/ (shell, DataTable, charts)
src/lib/distributor/  adapter interface, mock + real adapters, call logging, getDistributor()
src/lib/pricing/      pricing engine (pure) and rules persistence
src/lib/orders/       lifecycle, create, payment, submit, poll, notifications, customer DTO
src/lib/sync/         catalogue sync job
src/lib/admin/        dashboard metrics, reports, admin queries
src/lib/auth/         roles, admin guards, cron guard
supabase/migrations/  database schema + seed defaults
scripts/              catalogue, image, migrate and DB seed scripts
tests/                unit, contract (any Distributor), e2e (Playwright)
```

**Rules:**

- Outside `src/lib/distributor`, only import from `@/lib/distributor` (ESLint enforces this).
- Storefront code reads only the `public_products` view, never the `products` table, so cost price and margin never reach the browser. Customer order pages use a separate DTO (`src/lib/orders/public.ts`).
- Every admin page calls `requireAdminPage(role)` and every admin API is wrapped in `withAdmin(roleOrPermission)`. Middleware is only the first gate.
- Admin changes write `audit_log`; order changes write `order_events` through `transitionOrder()`.

## Scripts

| Command                 | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run dev`           | Dev server                                                       |
| `npm test`              | Unit + contract tests (the RLS test runs when Supabase env is set) |
| `npm run test:e2e`      | Playwright at 375 / 768 / 1440 px (screenshots in `test-results/screens`) |
| `npm run gen:catalogue` | Deterministic mock catalogue → `data/mock-catalogue.json`        |
| `npm run gen:images`    | Placeholder product images → `public/products/`                  |
| `npm run db:migrate`    | Apply new SQL migrations                                         |
| `npm run db:seed`       | Catalogue + demo users + sample orders (`-- --catalogue-only` to skip demo data) |
| `npm run db:types`      | Regenerate Supabase TypeScript types                             |

### E2E options

The default e2e run is read-only. Two suites write data and are opt-in:

- `E2E_CHECKOUT=1 npm run test:e2e -- checkout` places a real test order.
- `E2E_FAILED_ORDER_ID=<uuid> npm run test:e2e -- admin` retries a failed order (see the demo script for making one).
