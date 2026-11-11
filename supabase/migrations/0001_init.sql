-- LaraDirect initial schema (spec §6)

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
  price_override_inc_vat numeric(10,2),
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
  scope_value text,
  markup_type text not null check (markup_type in ('percent','fixed')),
  markup_value numeric(8,2) not null,
  min_margin_pct numeric(5,2) default 0,
  min_margin_amount numeric(8,2) default 0,
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
create sequence order_number_seq start 100001;
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('LD-' || nextval('order_number_seq')),
  customer_id uuid references customers,
  email text not null,
  status order_status not null default 'pending_payment',
  ship_to jsonb not null, bill_to jsonb,
  subtotal_inc_vat numeric(10,2), shipping_inc_vat numeric(10,2) default 0,
  vat_total numeric(10,2), total_inc_vat numeric(10,2),
  cost_total_ex_vat numeric(10,2),
  gross_profit numeric(10,2),
  stripe_payment_intent text, paid_at timestamptz,
  distributor_order_id text, distributor_status text,
  distributor_idempotency_key text unique,
  submit_attempts int default 0, last_error text, next_attempt_at timestamptz,
  school_po_number text,
  access_token text not null default replace(gen_random_uuid()::text, '-', ''), -- for /order/[n]?token=
  notes text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on orders (status);
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
create table order_events (
  id bigserial primary key, order_id uuid references orders on delete cascade,
  type text, message text, data jsonb, actor text, created_at timestamptz default now()
);

-- Returns (manual workflow, spec §11.1)
create table returns (
  id uuid primary key default gen_random_uuid(), order_id uuid references orders,
  status text not null default 'requested' check (status in ('requested','authorised','received','refunded','rejected')),
  reason text, tds_rma_reference text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- Ops
create table sync_runs (
  id uuid primary key default gen_random_uuid(), started_at timestamptz default now(), finished_at timestamptz,
  type text, products_seen int, products_changed int, price_changes int, stock_changes int, errors int, log text
);
create table distributor_logs (
  id bigserial primary key, method text, request jsonb, response jsonb,
  status text, duration_ms int, created_at timestamptz default now()
);
create table mock_distributor_state (
  key text primary key, value jsonb, updated_at timestamptz default now()
);
create table admin_users (
  user_id uuid primary key references auth.users, role user_role not null default 'viewer', name text,
  is_active boolean not null default true
);
create table audit_log (
  id bigserial primary key, actor uuid, action text, entity text, entity_id text,
  before jsonb, after jsonb, created_at timestamptz default now()
);
create table settings (key text primary key, value jsonb);
create table outbox (                              -- demo email log (spec §2)
  id bigserial primary key, to_email text, subject text, template text, payload jsonb,
  sent_at timestamptz, created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Storefront view: NEVER exposes cost, margin or distributor IDs (spec §6, §14)
-- ---------------------------------------------------------------------------
create view public_products with (security_barrier = true) as
select
  id, slug, brand,
  coalesce(title_override, name) as name,
  coalesce(description_override, description) as description,
  category, subcategory, specs, images, tags, mpn,
  coalesce(price_override_inc_vat, sell_price_inc_vat) as price_inc_vat,
  stock_qty, stock_status, eta, weight_kg, warranty_months, featured, updated_at
from products
where is_published = true and stock_status <> 'discontinued';

grant select on public_products to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
create or replace function is_admin(min_role user_role default 'viewer') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid() and is_active
      and array_position(enum_range(null::user_role), role)
          <= array_position(enum_range(null::user_role), min_role)
  );
$$;

alter table products enable row level security;
alter table pricing_rules enable row level security;
alter table price_history enable row level security;
alter table customers enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table shipments enable row level security;
alter table order_events enable row level security;
alter table returns enable row level security;
alter table sync_runs enable row level security;
alter table distributor_logs enable row level security;
alter table mock_distributor_state enable row level security;
alter table admin_users enable row level security;
alter table audit_log enable row level security;
alter table settings enable row level security;
alter table outbox enable row level security;

-- Admin read access (writes go through server route handlers using the service role).
create policy admin_read on products for select using (is_admin());
create policy admin_read on pricing_rules for select using (is_admin());
create policy admin_read on price_history for select using (is_admin());
create policy admin_read on orders for select using (is_admin());
create policy admin_read on order_items for select using (is_admin());
create policy admin_read on shipments for select using (is_admin());
create policy admin_read on order_events for select using (is_admin());
create policy admin_read on customers for select using (is_admin());
create policy admin_read on returns for select using (is_admin());
create policy admin_read on sync_runs for select using (is_admin());
create policy admin_read on distributor_logs for select using (is_admin('admin'));
create policy admin_read on audit_log for select using (is_admin('admin'));
create policy admin_read on settings for select using (is_admin());
create policy self_read on admin_users for select using (user_id = auth.uid() or is_admin('owner'));

-- Customers see only their own data.
create policy own_customer on customers for select using (user_id = auth.uid());
create policy own_addresses on addresses for all using (
  customer_id in (select id from customers where user_id = auth.uid())
);
create policy own_orders on orders for select using (
  customer_id in (select id from customers where user_id = auth.uid())
);
-- Note: customer-facing order queries must still select only non-cost columns (server-side DTO).
