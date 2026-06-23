create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('user', 'admin')),
  display_name text not null,
  api_key text not null,
  internal_note text,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key,
  sku text not null unique,
  name text not null,
  description text not null,
  price numeric(12, 2) not null check (price >= 0)
);

create table if not exists orders (
  id uuid primary key,
  user_id uuid not null references users(id),
  status text not null,
  total_amount numeric(12, 2) not null,
  shipping_address text not null,
  internal_fraud_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null
);

create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_products_search on products using gin (
  to_tsvector('simple', name || ' ' || sku || ' ' || description)
);
