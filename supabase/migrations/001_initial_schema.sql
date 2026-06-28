create extension if not exists "pgcrypto";

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  address text not null default '',
  google_maps_url text not null,
  upi_id text not null,
  upi_qr_url text,
  preparation_time_minutes integer not null default 30 check (preparation_time_minutes between 5 and 180),
  is_open boolean not null default true,
  closed_message text not null default 'We are closed right now. Please try again during business hours.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text,
  whatsapp_number text not null,
  orders_count integer not null default 0,
  lifetime_spend_paise integer not null default 0,
  last_visit_at timestamptz,
  average_spend_paise integer not null default 0,
  favourite_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, whatsapp_number)
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  price_paise integer not null check (price_paise > 0),
  image_url text,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type order_status as enum (
  'awaiting_screenshot',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

create table payment_files (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  whatsapp_media_id text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  status order_status not null default 'awaiting_screenshot',
  total_paise integer not null check (total_paise >= 0),
  special_instructions text,
  payment_file_id uuid references payment_files(id) on delete set null,
  whatsapp_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name_snapshot text not null,
  price_paise_snapshot integer not null check (price_paise_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  line_total_paise integer not null check (line_total_paise >= 0)
);

create table whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  state jsonb not null default '{"step":"idle","cart":[]}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, customer_id)
);

create table processed_webhooks (
  message_id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  actor text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_menu_items_restaurant_available on menu_items(restaurant_id, available, sort_order);
create index idx_orders_restaurant_created on orders(restaurant_id, created_at desc);
create index idx_orders_status on orders(status);
create index idx_order_items_order on order_items(order_id);
create index idx_customers_restaurant_phone on customers(restaurant_id, whatsapp_number);
create index idx_payment_files_customer on payment_files(customer_id, created_at desc);
create index idx_audit_logs_restaurant_created on audit_logs(restaurant_id, created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger restaurants_updated_at before update on restaurants for each row execute function set_updated_at();
create trigger customers_updated_at before update on customers for each row execute function set_updated_at();
create trigger menu_items_updated_at before update on menu_items for each row execute function set_updated_at();
create trigger orders_updated_at before update on orders for each row execute function set_updated_at();
create trigger whatsapp_sessions_updated_at before update on whatsapp_sessions for each row execute function set_updated_at();

create or replace function refresh_customer_stats(target_customer_id uuid)
returns void as $$
declare
  total_orders integer;
  total_spend integer;
  last_order timestamptz;
  favorite uuid;
begin
  select count(*), coalesce(sum(total_paise), 0), max(created_at)
    into total_orders, total_spend, last_order
  from orders
  where customer_id = target_customer_id
    and status <> 'cancelled';

  select menu_item_id
    into favorite
  from order_items
  join orders on orders.id = order_items.order_id
  where orders.customer_id = target_customer_id
    and order_items.menu_item_id is not null
  group by menu_item_id
  order by sum(quantity) desc
  limit 1;

  update customers
  set orders_count = coalesce(total_orders, 0),
      lifetime_spend_paise = coalesce(total_spend, 0),
      last_visit_at = last_order,
      average_spend_paise = case when coalesce(total_orders, 0) = 0 then 0 else total_spend / total_orders end,
      favourite_item_id = favorite
  where id = target_customer_id;
end;
$$ language plpgsql security definer;

alter table restaurants enable row level security;
alter table customers enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payment_files enable row level security;
alter table whatsapp_sessions enable row level security;
alter table processed_webhooks enable row level security;
alter table audit_logs enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-screenshots', 'payment-screenshots', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
