-- ============================================================
-- SCENTURY21 — Supabase schema + Row Level Security (RLS)
-- Idempotent: safe to run in the SQL editor even if an older
-- version of this script already ran.
--
-- AFTER running, promote yourself to admin (Supabase → SQL
-- editor, or Table editor → profiles → set role = 'admin'):
--
--   update public.profiles set role = 'admin'
--   where email = 'YOUR_EMAIL@example.com';
--
-- (Existing accounts are backfilled automatically by this script, so the
--  update above will match your account.)
--
-- Only profiles with role = 'admin' can manage the store. All
-- other access is enforced by RLS in the database.
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

-- Auto-create a profile row when a user signs up (Google puts the
-- name in full_name, email signup uses name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profile rows for users who signed up before this trigger existed,
-- otherwise they could never be promoted to admin.
insert into public.profiles (id, email, name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
on conflict (id) do nothing;

-- Admin check helper — used by RLS policies below AND by the app
-- (supabase.rpc('is_admin')).
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

-- ---------- Products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text not null default '',
  description text not null default '',
  category text not null default 'Spray Perfumes',
  family text not null default '',
  size text not null default '100ml',
  price_kobo bigint not null,           -- prices in kobo (NGN * 100)
  stock int not null default 0,
  rating numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  tag text check (tag in ('Bestseller', 'New', 'Limited')) default null,
  featured boolean not null default false,
  image_url text not null default '',   -- uploaded perfume photo (storage)
  palette text[] not null default '{#d4a94a,#b45309,#7c2d12}',
  notes_top text[] not null default '{}',
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade from the earlier schema (categories table + category_id FK).
-- No-ops on a fresh database.
alter table public.products drop column if exists category_id;
drop table if exists public.categories cascade;
alter table public.products add column if not exists category text not null default 'Spray Perfumes';
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists image_url text not null default '';

-- ---------- Product photos (Supabase Storage bucket) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

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
  name text not null,
  size text not null default '',
  price_kobo bigint not null,
  qty int not null check (qty > 0),
  created_at timestamptz not null default now()
);

-- Carts, wishlist, reviews (reserved for future phases; already RLS-guarded)
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
create table if not exists public.wishlist (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
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
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
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
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles
  for select using (true);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Products: public read for active items; admins manage everything
drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products
  for select using (active = true or public.is_admin());
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.is_admin());

-- Orders: customer sees + creates their own; admins see all & update
drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

drop policy if exists "order_items_read" on public.order_items;
create policy "order_items_read" on public.order_items
  for select using (
    exists (select 1 from public.orders o
      where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
  );
drop policy if exists "order_items_insert_own" on public.order_items;
create policy "order_items_insert_own" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid())
  );
drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (public.is_admin());

-- Reserved tables: private per user / public read
drop policy if exists "carts_own" on public.carts;
create policy "carts_own" on public.carts
  for all using (auth.uid() = user_id or public.is_admin());
drop policy if exists "cart_items_own" on public.cart_items;
create policy "cart_items_own" on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin()))
  );
drop policy if exists "wishlist_own" on public.wishlist;
create policy "wishlist_own" on public.wishlist
  for all using (user_id = auth.uid());
drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews
  for select using (true);
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews
  for insert with check (auth.uid() is not null);
drop policy if exists "site_settings_read" on public.site_settings;
create policy "site_settings_read" on public.site_settings
  for select using (true);
drop policy if exists "site_settings_admin_all" on public.site_settings;
create policy "site_settings_admin_all" on public.site_settings
  for all using (public.is_admin());

-- ---------- Indexes ----------
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_active on public.products (active);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_order_items_order on public.order_items (order_id);

-- ============================================================
-- SEED CATALOG - the original 13 perfumes, converted to the new
-- "Spray Perfumes" category (they are all sprays). Add oil-based
-- perfumes from the admin dashboard. Idempotent (by slug).
-- ============================================================
insert into public.products
  (slug, name, subtitle, category, family, size, price_kobo, stock, rating, reviews_count, tag, featured, palette, notes_top, notes_heart, notes_base, description)
values
('amber-oud-royale','Amber Oud Royale','Golden oud wrapped in warm amber','Spray Perfumes','Amber Oud','100ml',38500000,14,4.9,128,'Bestseller',true,array['#f59e0b','#b45309','#7c2d12'],array['Saffron','Bergamot','Nutmeg'],array['Rose absolute','Agarwood (oud)','Cinnamon'],array['Amber','Sandalwood','Vanilla','Tonka'],'Our signature masterpiece. Rare agarwood is aged in amber resin before blending, yielding a scent that opens bright with saffron and settles into a golden, honeyed warmth that lingers for days.'),
('midnight-iris','Midnight Iris','Powdery violet bloom under a starless sky','Spray Perfumes','Floral','100ml',21500000,22,4.8,94,null,true,array['#a78bfa','#7c3aed','#4c1d95'],array['Iris','Violet leaf','Bergamot'],array['Orris butter','Jasmine','Heliotrope'],array['Cedarwood','White musk','Ambroxan'],'A nocturnal floral built on rare orris root. Velvety iris and violet leaf unfold over cool cedar and white musk — sophisticated, quietly magnetic.'),
('citrus-elan','Citrus Élan','Sparkling Mediterranean citrus, airy and bright','Spray Perfumes','Fresh Citrus','100ml',12800000,31,4.6,67,'New',false,array['#fbbf24','#34d399','#0ea5e9'],array['Bergamot','Lemon','Pink grapefruit'],array['Neroli','Petitgrain','Orange blossom'],array['White musk','Vetiver','Light cedar'],'A burst of sun-ripened bergamot and lemon over neroli and white musk. Effervescent, clean and endlessly wearable — the perfect signature for warm weather.'),
('velvet-rose-noir','Velvet Rose Noir','Dark damask rose on a bed of patchouli','Spray Perfumes','Rose','100ml',29500000,11,4.9,76,null,true,array['#f472b6','#be185d','#500724'],array['Blackcurrant','Pink pepper','Lychee'],array['Damask rose','Peony','Geranium'],array['Patchouli','Tonka bean','White musk'],'An uncompromising rose — heady damask absolute darkened with blackcurrant and pink pepper, resting on velvet patchouli and tonka. Dramatic, romantic, powerful.'),
('ocean-bloom','Ocean Bloom','Salty breeze, water lilies and driftwood','Spray Perfumes','Aquatic','100ml',18900000,18,4.7,58,null,false,array['#22d3ee','#0ea5e9','#1e3a8a'],array['Sea salt','Bergamot','Marine accord'],array['Water lily','Freesia','Lotus'],array['Driftwood','Ambergris','Grey amber'],'The smell of a distant shore — mineral sea salt and bergamot open onto water lily and freesia, drying down to warm driftwood and ambergris.'),
('saffron-smoke','Saffron Smoke','Incense, leather and glowing saffron','Spray Perfumes','Smoky Spice','100ml',34000000,9,4.8,83,'Limited',false,array['#ef4444','#7f1d1d','#1c1917'],array['Cardamom','Saffron','Black pepper'],array['Frankincense','Leather','Cypriol'],array['Smoked woods','Musk','Labdanum'],'Cathedral incense and supple leather wrapped around radiant saffron. Smoky, intimate and undeniably luxurious — for evenings that matter.'),
('white-santal','White Santal','Creamy sandalwood softened by fig','Spray Perfumes','Woody','100ml',19800000,16,4.8,112,'Bestseller',true,array['#e2e8f0','#cbd5e1','#94a3b8'],array['Fig leaf','Mandarin','Cardamom'],array['Sandalwood','Orris','Coconut milk'],array['Cashmere wood','White musk','Tonka'],'A cult-favourite woody skin scent. Creamy sandalwood and cashmere woods are lifted by green fig leaf — soft, warm and incredibly addictive.'),
('neroli-solaire','Neroli Solaire','Golden orange blossom in the sun','Spray Perfumes','Floral Fresh','100ml',14200000,26,4.7,49,'New',false,array['#fdba74','#fb923c','#f59e0b'],array['Neroli','Petitgrain','Mandarin'],array['Orange blossom','Tuberose','Honeysuckle'],array['White amber','Musk','Blond woods'],'Sunshine captured in a bottle. Bitter orange blossom and neroli sparkle over white amber and musk — bright, joyful, radiant.'),
('noir-absolu','Noir Absolu','Dark cacao, oud and night vanilla','Spray Perfumes','Oriental','100ml',42000000,6,5,41,'Bestseller',true,array['#1e1b4b','#312e81','#6d28d9'],array['Bergamot','Davana','Rum'],array['Oud','Cacao','Turkish rose'],array['Black vanilla','Labdanum','Dark amber'],'Our darkest and most opulent creation. Bitter cacao and oud meet black vanilla and labdanum in a brooding, hypnotic oriental that feels almost alive.'),
('green-fig','Green Fig','Crisp green fig leaves and soft cedar','Spray Perfumes','Green','100ml',17600000,13,4.6,37,null,false,array['#4ade80','#16a34a','#14532d'],array['Fig','Galbanum','Lime'],array['Fig leaf','Vetiver','Green tea'],array['Cedarwood','Musk','Oakmoss'],'A stroll through a fig orchard at dawn. Green, dewy and quietly woody — fresh fig and galbanum over vetiver and cedar.'),
('rose-damascena','Rose Damascena','Two thousand petals, one bottle','Spray Perfumes','Rose','100ml',31000000,8,4.9,65,null,false,array['#fb7185','#e11d48','#881337'],array['Lychee','Raspberry','Pink pepper'],array['Damascena rose','Geranium','Peony'],array['Amberwood','White musk','Soft patchouli'],'Distilled from hand-picked Damascena roses at dawn. Lychee and raspberry brighten a lush, dewy rose heart over amberwood and white musk.'),
('vanille-orchidee','Vanille Orchidée','Bourbon vanilla wrapped in orchid','Spray Perfumes','Gourmand','100ml',16800000,21,4.7,73,'New',false,array['#fde68a','#f59e0b','#b45309'],array['Mandarin','Pink pepper','Pear'],array['Orchid','Jasmine','Heliotrope'],array['Bourbon vanilla','Tonka','Benzoin'],'Gourmand, golden and comforting. Madagascan bourbon vanilla and orchid are warmed by tonka and benzoin — dessert, but make it couture.')
on conflict (slug) do nothing;
