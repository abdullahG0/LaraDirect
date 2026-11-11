# LaraDirect demo script

A 20–30 minute walkthrough for schools, stakeholders or TD SYNNEX. Each step says what to click and what to point out.

## Before the demo (10 minutes)

1. In `.env.local` set `DEMO_TIME_SCALE=60` so a day passes in about 24 minutes. An order then goes from paid to delivered in roughly 2–3 minutes of real time.
2. Make sure the database is ready: `npm run db:migrate`, then `npm run db:seed` (products, demo admins, sample orders).
3. Start the app: `npm run build && npm run start` (faster than dev mode).
4. Open two browser windows: the store at `/`, and the admin at `/admin/login` (sign in as **Owner**).
5. In admin, go to **Stock & sync** and press **Sync now** twice so the dashboard shows recent price and stock changes.

## Part 1: The store (8 minutes)

1. **Home page.** Point out the demo banner, free-delivery bar, “Shop for teachers” categories and the trust bar.
2. **Search.** Type “chromebook” in the header. Suggestions appear as you type.
3. **Category page.** Open **Laptops**. Tick a brand and drag the price slider. The URL changes, so a filtered list can be shared with a colleague. Show the mobile filter drawer by narrowing the window.
4. **Product page.** Open a Chromebook. Show the gallery zoom, the **inc/ex VAT** toggle for school budgets, stock message, delivery and warranty, the specs tab and “Frequently bought together”.
5. **Basket.** Add the Chromebook and a headset. The mini basket slides out with the free-delivery progress bar and VAT breakdown. Open the full basket and apply `TEACHER10`.
6. **Checkout.** Try a bad postcode (`12345`) to show the clear, labelled error. Then fill in a real-looking UK address, tick “Delivering to a school”, add a school PO number and choose next-day delivery.
7. **Pay.** With Stripe test keys, pay with `4242 4242 4242 4242`, any future date, any CVC. Without Stripe keys, payment is simulated.
8. **Order page.** The customer sees the order number, a four-step timeline, items and the “emails sent” preview. Leave this tab open: it updates itself every 15 seconds as the order moves through Preparing → Dispatched → Delivered, with carrier tracking and, for laptops, serial numbers on delivery.

## Part 2: The admin (12 minutes)

1. **Dashboard.** KPIs for today, 7 and 30 days, revenue and gross profit, average margin. Point out **Needs attention**: failed orders, below-floor margins, backorders, sync errors.
2. **Orders → the order you just placed.** Line items with cost, sell price, profit and margin, the TD SYNNEX order ID, shipments and the full event timeline. Press **Refresh status** to pull the latest from TD SYNNEX.
3. **Products.** Filter “Below margin floor”. Edit a price override inline in the table, then open the product to show the price build-up, price history chart and margin calculator.
4. **Pricing.** Edit the *Headphones & Audio* rule from 18% to 22%. Press **Preview impact**: how many prices change, average margin before and after, the biggest changes. Then **Apply and re-price**. Show the new entries in **Price change history** and the **Audit log**.
5. **Stock & sync.** Sync run history, connection status (mock), and the adapter call log with secrets and customer contact details redacted.
6. **Reports.** Group by week, then by category. Export CSV and open it in Excel.
7. **Roles.** Sign out and use the **Support** button on the login page: support staff can manage orders but the pricing page is read-only, and Users isn’t in the menu.
8. **⌘K / Ctrl+K.** Search for an order number, a product or a customer from anywhere.

## Showing a failure and a retry (acceptance #4)

1. Admin → **Settings → Mock failure injection**. Add a SKU to “SKUs TD SYNNEX always rejects”. Find one under Products (e.g. a headset) and copy its SKU. Save.
2. In the store, buy that product.
3. The order fails straight away: the customer page says “Problem with your order — we’re on it”, the admin gets an alert email (see the outbox), and the dashboard shows it under **Needs attention**.
4. Open the order: a red banner shows the reason. Remove the SKU from the reject list in Settings, then press **Retry now** on the order. It’s accepted by TD SYNNEX and continues as normal.

For random network failures instead, set “Random network failure rate” to 100%: orders retry after 1, 5 and 15 minutes, then fail after 5 attempts. Set it back to blank afterwards.

## Useful facts for questions

- **Switching to the real TD SYNNEX** needs no code changes outside `src/lib/distributor`: set `DISTRIBUTOR_MODE=real` once the real adapter is filled in.
- **Cost price and margin never reach the browser.** The storefront reads a database view without those columns, and an automated test crawls every page and API to check.
- **No third-party scripts or fonts** load on the store, apart from Stripe’s own checkout page.
- **Every admin change is audited** with who, when, before and after.
