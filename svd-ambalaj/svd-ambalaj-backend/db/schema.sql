-- PostgreSQL schema definition for SVD Ambalaj backend.
-- This file creates the core structures required to migrate from the JSON data store
-- to Neon/PostgreSQL, covering catalogue, ordering, media and landing page content.

-- Extensions --------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Catalog -----------------------------------------------------------------------

create table if not exists categories (
  id           text primary key,
  name         text not null,
  slug         text not null unique,
  description  text,
  image        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

create index if not exists idx_categories_name on categories using gin ((to_tsvector('simple', coalesce(name, ''))));

create table if not exists products (
  id             text primary key,
  title          text not null,
  slug           text not null unique,
  description    text,
  price          numeric(12, 2) not null,
  category_id    text not null references categories(id) on update cascade on delete restrict,
  stock          integer not null default 0 check (stock >= 0),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_created_at on products(created_at desc);

create table if not exists product_bulk_pricing (
  product_id     text not null references products(id) on delete cascade,
  min_quantity   integer not null check (min_quantity > 0),
  price          numeric(12, 2) not null check (price >= 0),
  created_at     timestamptz not null default now(),
  primary key (product_id, min_quantity)
);

-- Media -------------------------------------------------------------------------

create table if not exists media (
  id             text primary key,
  storage_key    text not null unique,
  filename       text not null,
  original_name  text,
  mime_type      text,
  size_bytes     integer check (size_bytes is null or size_bytes >= 0),
  url            text not null unique,
  checksum       text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create table if not exists product_images (
  id             bigserial primary key,
  product_id     text not null references products(id) on delete cascade,
  media_id       text references media(id) on delete set null,
  image_url      text not null,
  alt_text       text,
  sort_order     integer not null default 0,
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists idx_product_images_product on product_images(product_id);
create unique index if not exists uq_product_images_primary on product_images(product_id) where is_primary;
create unique index if not exists uq_product_images_sort on product_images(product_id, sort_order);

-- Landing media -----------------------------------------------------------------

create table if not exists landing_media (
  id                          integer primary key default 1,
  hero_video_src              text,
  hero_video_poster           text,
  hero_video_media_id         text references media(id) on delete set null,
  hero_video_poster_media_id  text references media(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz
);

create table if not exists landing_media_gallery (
  id               bigserial primary key,
  landing_media_id integer not null references landing_media(id) on delete cascade,
  media_id         text references media(id) on delete set null,
  image_url        text not null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

create index if not exists idx_landing_media_gallery_landing on landing_media_gallery(landing_media_id, sort_order);
create unique index if not exists uq_landing_media_gallery_sort on landing_media_gallery(landing_media_id, sort_order);

create table if not exists landing_media_highlights (
  id               bigserial primary key,
  landing_media_id integer not null references landing_media(id) on delete cascade,
  title            text not null,
  caption          text,
  media_id         text references media(id) on delete set null,
  image_url        text not null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz
);

create index if not exists idx_landing_media_highlights_landing on landing_media_highlights(landing_media_id, sort_order);
create unique index if not exists uq_landing_media_highlights_sort on landing_media_highlights(landing_media_id, sort_order);

-- Customers & orders ------------------------------------------------------------

create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  company       text,
  email         text,
  phone         text,
  tax_number    text,
  address       text,
  city          text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (email)
);

create index if not exists idx_customers_created_at on customers(created_at desc);

create table if not exists orders (
  id              text primary key,
  customer_id     uuid references customers(id) on delete set null,
  status          text not null default 'pending',
  currency        char(3) not null default 'TRY',
  subtotal        numeric(12, 2) not null default 0,
  discount_total  numeric(12, 2) not null default 0,
  shipping_total  numeric(12, 2) not null default 0,
  total           numeric(12, 2) not null default 0,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_orders_status on orders(status);

create table if not exists order_items (
  id             bigserial primary key,
  order_id       text not null references orders(id) on delete cascade,
  product_id     text references products(id) on delete set null,
  title          text not null,
  quantity       integer not null check (quantity > 0),
  unit_price     numeric(12, 2) not null check (unit_price >= 0),
  subtotal       numeric(12, 2) not null check (subtotal >= 0),
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists idx_order_items_order on order_items(order_id);
create unique index if not exists uq_order_items_unique on order_items(order_id, product_id, title);

-- Sample requests ---------------------------------------------------------------

create table if not exists samples (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  company        text,
  email          text,
  phone          text,
  product_name   text,
  quantity_note  text,
  notes          text,
  status         text not null default 'requested',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists idx_samples_status on samples(status);
create index if not exists idx_samples_created_at on samples(created_at desc);
