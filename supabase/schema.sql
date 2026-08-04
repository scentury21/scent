-- ============================================================
-- SCENTURY21 — Supabase schema + Row Level Security (RLS)
-- Run this in the Supabase SQL editor, then connect your keys
-- in .env.local. See README for the full setup checklist.
-- ============================================================

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin check helper (used by RLS policies below)
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- Products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text not null default '',
  description text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  family text not null default '',
  size text not null default '100ml',
  price_kobo bigint not null,           -- prices stored in kobo (NGN * 100)
  stock int not null default 0,
  rating numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  tag text check (tag in ('Bestseller', 'New', 'Limited')) default null,
  palette text[] not null default '{#d4a94a,#b45309,#7c2d12}',
  notes_top text[] not null default '{}',
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Product images (Supabase Storage bucket: product-images) ----------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,            -- path inside the bucket
  alt text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Carts ----------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  qty int not null default 1 check (qty > 0 and qty <= 99),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- ---------- Orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  order_number text unique not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_reference text,
  currency text not null default 'NGN',
  subtotal_kobo bigint not null,
  shipping_kobo bigint not null default 0,
  total_kobo bigint not null,
  -- Delivery fields (worldwide, no map API)
  delivery_country text not null,
  delivery_country_code text not null,
  delivery_region text not null default '',
  delivery_city text not null default '',
  delivery_postal text not null default '',
  delivery_address text not null,
  delivery_landmark text not null default '',
  delivery_notes text not null default '',
  delivery_latitude double precision,
  delivery_longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,                    -- snapshot at purchase time
  size text not null default '',
  price_kobo bigint not null,
  qty int not null check (qty > 0),
  created_at timestamptz not null default now()
);

-- ---------- Wishlist ----------
create table if not exists public.wishlist (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  text text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Site settings / social links ----------
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,              -- e.g. 'whatsapp_number', 'instagram'
  value text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('whatsapp_number', '2348123456789'),
  ('instagram', 'https://instagram.com/scentury21'),
  ('facebook', 'https://facebook.com/scentury21'),
  ('tiktok', 'https://tiktok.com/@scentury21'),
  ('email', 'hello@scentury21.com')
on conflict (key) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;

-- Profiles: everyone can read names; users edit their own; admins read all
create policy "profiles_read" on public.profiles
  for select using (true);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Products: public read for active items; admins manage everything
create policy "products_read" on public.products
  for select using (active = true or public.is_admin());
create policy "products_admin_all" on public.products
  for all using (public.is_admin());

-- Product images: public read; admin write
create policy "product_images_read" on public.product_images
  for select using (true);
create policy "product_images_admin_all" on public.product_images
  for all using (public.is_admin());

-- Carts: private per user, admin all
create policy "carts_own" on public.carts
  for all using (auth.uid() = user_id or public.is_admin());
create policy "cart_items_own" on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin()))
  );

-- Orders: customer sees + creates their own; admins see all
create policy "orders_read_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());
create policy "order_items_read" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );
create policy "order_items_admin_all" on public.order_items
  for all using (public.is_admin());

-- Wishlist: private per user
create policy "wishlist_own" on public.wishlist
  for all using (user_id = auth.uid());

-- Reviews: public read; signed-in users write
create policy "reviews_read" on public.reviews
  for select using (true);
create policy "reviews_insert" on public.reviews
  for insert with check (auth.uid() is not null);

-- Site settings: public read; admin write
create policy "site_settings_read" on public.site_settings
  for select using (true);
create policy "site_settings_admin_all" on public.site_settings
  for all using (public.is_admin());

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_active on public.products (active);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_reviews_product on public.reviews (product_id);
