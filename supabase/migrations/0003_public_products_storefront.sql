-- Storefront additions to public_products (step 3.2).
-- Adds RRP (inc VAT) for "RRP" reference prices, created_at for "Newest" sorting, and a
-- full-text search vector. Still no cost, margin or distributor SKU columns.
-- New columns go at the end so `create or replace view` keeps existing grants.

create or replace view public_products with (security_barrier = true) as
select
  id, slug, brand,
  coalesce(title_override, name) as name,
  coalesce(description_override, description) as description,
  category, subcategory, specs, images, tags, mpn,
  coalesce(price_override_inc_vat, sell_price_inc_vat) as price_inc_vat,
  stock_qty, stock_status, eta, weight_kg, warranty_months, featured, updated_at,
  round(rrp_ex_vat * 1.2, 2) as rrp_inc_vat,
  created_at,
  to_tsvector('english',
    brand || ' ' || coalesce(title_override, name) || ' ' || category || ' ' ||
    coalesce(subcategory, '') || ' ' || array_to_string(tags, ' ')
  ) as search
from products
where is_published = true and stock_status <> 'discontinued';

grant select on public_products to anon, authenticated;
