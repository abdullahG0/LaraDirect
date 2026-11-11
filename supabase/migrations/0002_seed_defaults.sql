-- Default pricing rules (spec §7.2) and settings (spec §20 placeholders)

insert into pricing_rules (scope, scope_value, markup_type, markup_value, min_margin_pct, priority) values
  ('global',   null,                     'percent',  8,  3, 0),
  ('category', 'Laptops',                'percent',  5,  3, 0),
  ('category', 'Tablets',                'percent',  5,  3, 0),
  ('category', 'Desktops & All-in-ones', 'percent',  5,  3, 0),
  ('brand',    'Apple',                  'percent',  3,  2, 0),
  ('category', 'Monitors & Displays',    'percent', 10,  5, 0),
  ('category', 'Headphones & Audio',     'percent', 18, 10, 0),
  ('category', 'Peripherals',            'percent', 15,  8, 0),
  ('category', 'Networking & Power',     'percent', 30, 15, 0),
  ('category', 'Software & Accessories', 'percent', 30, 15, 0);

insert into settings (key, value) values
  ('vat_rate',                '0.20'),
  ('free_delivery_threshold', '100'),
  ('shipping_rates',          '{"standard": 4.99, "next_day": 9.99}'),
  ('promo_codes',             '[{"code": "TEACHER10", "type": "percent", "value": 10, "active": true}]'),
  ('company',                 '{"name": "LaraDirect Ltd (placeholder)", "number": "00000000", "vat": "GB000000000"}'),
  ('feature_flags',           '{"demo_banner": true, "blind_shipment": true, "hold_below_floor": false}'),
  ('sync_interval_minutes',   '15');
