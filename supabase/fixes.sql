-- ============================================================
-- SCENTURY21 — SAFE re-run of the missing pieces
-- Paste the WHOLE block into Supabase → SQL editor → Run.
-- Every statement is guarded (drop-if-exists / create-or-
-- replace), so it is 100% safe to run again and again.
-- ============================================================

-- ---------- 1) Admin helper (used by the order policies) ----------
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

-- ---------- 2) Orders: customer sees only their own; admins all ----------
drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders
  for insert with check (user_id = auth.uid());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin());

drop policy if exists "orders_insert_guest" on public.orders;
create policy "orders_insert_guest" on public.orders
  for insert with check (auth.uid() is null and user_id is null);

-- ---------- 3) Order items ----------
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

drop policy if exists "order_items_insert_guest" on public.order_items;
create policy "order_items_insert_guest" on public.order_items
  for insert with check (
    auth.uid() is null and
    exists (select 1 from public.orders o where o.id = order_id and o.user_id is null)
  );

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all" on public.order_items
  for all using (public.is_admin());

-- ---------- 4) Guest order lookup RPCs (tracking by order # + email) ----------
create or replace function public.get_order_for_customer(p_order_number text, p_email text)
returns table (
  id uuid, order_number text, customer_name text, customer_email text, customer_phone text,
  status text, payment_status text, payment_reference text, currency text,
  subtotal_kobo bigint, shipping_kobo bigint, total_kobo bigint,
  delivery_country text, delivery_region text, delivery_city text, delivery_postal text,
  delivery_address text, delivery_landmark text, delivery_notes text,
  delivery_latitude double precision, delivery_longitude double precision,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select o.id, o.order_number, o.customer_name, o.customer_email, o.customer_phone,
    o.status, o.payment_status, o.payment_reference, o.currency,
    o.subtotal_kobo, o.shipping_kobo, o.total_kobo,
    o.delivery_country, o.delivery_region, o.delivery_city, o.delivery_postal,
    o.delivery_address, o.delivery_landmark, o.delivery_notes,
    o.delivery_latitude, o.delivery_longitude, o.created_at
  from public.orders o
  where o.order_number = p_order_number
    and lower(o.customer_email) = lower(p_email)
$$;

create or replace function public.get_order_items_for_customer(p_order_id uuid, p_email text)
returns table (name text, size text, price_kobo bigint, qty int)
language sql
security definer
set search_path = public
stable
as $$
  select i.name, i.size, i.price_kobo, i.qty
  from public.order_items i
  join public.orders o on o.id = i.order_id
  where o.id = p_order_id
    and lower(o.customer_email) = lower(p_email)
$$;

-- ---------- 5) Telegram bot drafts table ----------
create table if not exists public.bot_drafts (
  chat_id bigint primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.bot_drafts enable row level security;
