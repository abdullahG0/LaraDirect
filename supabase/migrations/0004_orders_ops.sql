-- Phase 2–7 additions: checkout fields, Stripe idempotency, sync grace period, customer notes,
-- customer read access to their own order lines (account page). Additive only.

-- Checkout (step 4.2–4.4)
alter table orders add column if not exists stripe_session_id text unique;
alter table orders add column if not exists delivery_method text not null default 'standard';
alter table orders add column if not exists promo_code text;
alter table orders add column if not exists discount_inc_vat numeric(10,2) not null default 0;
alter table orders add column if not exists school_name text;
alter table orders add column if not exists margin_alert boolean not null default false;
alter table orders add column if not exists is_sample boolean not null default false;
create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_next_attempt_idx on orders (status, next_attempt_at);

-- Every Stripe event is recorded once, so a resent webhook changes nothing (step 4.4).
create table if not exists stripe_events (
  id text primary key, type text not null, received_at timestamptz not null default now()
);
alter table stripe_events enable row level security;

-- Sync: when a product first went missing from the distributor feed (step 2.6 grace period).
alter table products add column if not exists missing_since timestamptz;

-- Customers: internal notes (step 7.1).
alter table customers add column if not exists notes text;
create unique index if not exists customers_email_idx on customers (lower(email));

-- Indexes the admin pages lean on.
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_events_order_idx on order_events (order_id, created_at);
create index if not exists price_history_product_idx on price_history (product_id, changed_at desc);
create index if not exists distributor_logs_created_idx on distributor_logs (created_at desc);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

-- Signed-in customers may read lines and shipments of their own orders (account page, step 8.2).
-- The account page still selects only customer-safe columns server-side.
drop policy if exists own_order_items on order_items;
create policy own_order_items on order_items for select using (
  order_id in (select o.id from orders o join customers c on c.id = o.customer_id where c.user_id = auth.uid())
);
drop policy if exists own_shipments on shipments;
create policy own_shipments on shipments for select using (
  order_id in (select o.id from orders o join customers c on c.id = o.customer_id where c.user_id = auth.uid())
);

-- Extra settings used by the admin settings page (step 7.4).
insert into settings (key, value) values
  ('mock_controls', '{"fail_rate": null, "reject_skus": []}'),
  ('email_templates', '{"order_confirmation": {"subject": "Thanks for your order {{orderNumber}}"}, "order_dispatched": {"subject": "Your order {{orderNumber}} is on its way"}, "order_delivered": {"subject": "Your order {{orderNumber}} has been delivered"}, "order_problem": {"subject": "An update on your order {{orderNumber}}"}}')
on conflict (key) do nothing;
