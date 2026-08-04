# 🦢 SCENTURY21

A premium perfume e-commerce platform — luxury customer storefront + admin
dashboard in one **Next.js** app. Built from the *Scentury21 Final Updated Plan
v2* specification.

> **Currently shipping:** a complete, polished storefront and admin dashboard
> running on demo data (localStorage). Supabase, Paystack and WhatsApp
> integrations are scaffolded and ready — add your keys to go live (see
> [Going live](#-going-live)).

![stack](https://img.shields.io/badge/stack-Next.js%2016%20·%20TypeScript%20·%20Tailwind%20v4-blue)

---

## ✨ What's included

**Customer storefront**
- 🎨 **Chromatic Waves** atmospheric canvas background — the brand's signature visual
- 🛍️ Shop with live search, category filters and sorting
- 🫙 Procedural SVG perfume bottles (no image assets needed)
- 📄 Product pages with fragrance notes pyramid, stock, reviews, recommendations
- 🛒 Cart (localStorage) + full checkout
- 🌍 **Worldwide delivery, no Google Maps**: manual country selection, dynamic
  state/region lists from a local dataset, optional IP country suggestion,
  and **"Use my current location"** GPS pinning (lat/lng stored with the order)
- 💳 Paystack online payment (demo mode until you add your public key)
- 💬 Order manually on WhatsApp (auto-composed message with address + GPS)
- 👤 Profile with editable name/phone and order history
- 🤍 Wishlist with live badge

**Admin dashboard** (`/admin`)
- 📊 Analytics: revenue, orders, customers, low-stock, weekly sales chart, top products
- 🫙 Product management: add / edit / delete (persists in this browser)
- 📦 Orders: status management, full delivery details incl. GPS, WhatsApp customer link
- 👥 Customers table derived from orders
- Demo login gate — production uses Supabase Auth + database-enforced RLS

## 🚀 Quickstart

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm run build && npm start
```

## 🗂 Project structure

```
app/
  page.tsx             — home (hero + Chromatic Waves + collections)
  shop/                — shop explorer (search/filter/sort)
  product/[id]/        — product detail + reviews
  cart/                — cart
  checkout/            — checkout + order success
  profile/             — profile + order history
  wishlist/
  admin/               — dashboard, products, orders, customers
  api/
    verify-payment/    — server-side Paystack verification
    whatsapp-notify/   — WhatsApp Business Cloud API notification
components/            — waves, header, footer, bottle, cards, admin UI
lib/
  products.ts          — demo catalog (12 fragrances)
  countries.ts         — local worldwide country/region dataset
  cart.tsx             — cart context (localStorage)
  store.ts             — demo data layer (orders, wishlist, profile, admin)
  currency.ts          — NGN/USD formatting
supabase/schema.sql    — full schema + RLS policies, ready to run
```

## 🔌 Going live

### 1 · Supabase (auth, database, storage)
1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run **`supabase/schema.sql`** — creates all tables and RLS policies.
3. Copy your Project URL + anon key into `.env.local` (see `.env.example`).
4. Enable **Google** and email/password providers in Authentication → Providers.
5. Create a `product-images` Storage bucket (public) for admin uploads.

The schema enforces roles in the **database** (RLS), never just the frontend:
normal signups get `customer`; promote someone to admin with
`update public.profiles set role = 'admin' where id = '<uid>';`.

### 2 · Paystack (payments)
1. Create an account at [paystack.com](https://paystack.com).
2. Settings → API Keys & Webhooks → copy the **public key** and **secret key**.
3. `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (client) and `PAYSTACK_SECRET_KEY` (server-only).
4. Checkout automatically switches from demo mode to the real Paystack popup;
   `app/api/verify-payment` verifies transactions server-side before an order
   is treated as PAID.

### 3 · WhatsApp (order notifications)
1. Create an app at [developers.facebook.com](https://developers.facebook.com),
   connect a WhatsApp Business account.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` and
   `NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER`.
3. Every paid order POSTs to `app/api/whatsapp-notify`, which sends order
   number, customer, items, total, payment status and delivery details
   (incl. GPS) to your business number. Credentials stay server-side.

### 4 · Deploy to Vercel
1. Push this repo to GitHub (below).
2. On [vercel.com](https://vercel.com) → **New Project** → import the repo — it
   auto-detects Next.js. Zero config.
3. Add the same environment variables in Project → Settings → Environment Variables.

## 🐙 Push to GitHub

```bash
git init                     # already done if scaffolded here
git add -A
git commit -m "Scentury21 storefront + admin dashboard"
git branch -M main
git remote add origin https://github.com/<you>/scentury21.git
git push -u origin main
```

## 🗺 Delivery design (per spec)

- **Manual country selection is primary** — customers are never forced into an
  auto-detected country. IP detection is an optional suggestion only.
- Country → State/Province/Region fields populate from a **local dataset**
  (`lib/countries.ts`) — no country API, no Google Maps.
- Precise location via **browser GPS** permission; lat/lng stored on the order
  and shown in the admin for routing. No address is ever inferred from IP/email.

## 🧾 License

MIT-style — free to ship. Scentury21 plan & copy © Scentury21.
