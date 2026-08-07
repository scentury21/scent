# 🦢 SCENTURY21

A premium perfume e-commerce platform — luxury customer storefront + admin
dashboard in one **Next.js** app. Built from the *Scentury21 Final Updated Plan
v2* specification.

> **Currently shipping:** a complete storefront and admin dashboard backed by
> **Supabase** — products, orders and admins live in the database with Row Level
> Security. The admin signs in with Google and only accounts granted the admin
> role can access it. Paystack, WhatsApp and Telegram integrations are ready —
> add your keys to go live (see [Going live](#-going-live)).

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
- 🔐 **Google-only sign-in** — access is granted only to accounts with
  role = 'admin' in `public.profiles` (managed in Supabase)
- 📊 Analytics: revenue, orders, customers, low-stock, weekly sales chart, top products
- 🫙 Product management: add / edit / delete, **photo upload** (Supabase Storage),
  **category** (Oil Perfumes / Spray Perfumes) and **size in ml**
- 📦 Orders: status management, full delivery details incl. GPS, WhatsApp customer link
- 👥 Customers table derived from real orders
- Everything enforced by RLS in the database, never just the frontend

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
    telegram-notify/   — proxy to the Supabase Edge Function → Telegram
supabase/functions/telegram-notify/ — Edge Function that sends the Telegram alert
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
2. In the SQL editor, run **`supabase/schema.sql`** — creates all tables, RLS
   policies, the public `product-images` Storage bucket, and seeds the perfume
   catalog (12 sprays, category = "Spray Perfumes"). Safe to re-run.
3. Copy your Project URL + anon key into `.env.local` (see `.env.example`).
4. Enable **Google** and email/password providers in Authentication → Providers.
5. **Grant yourself admin**: sign in with Google once, then run
   `update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';`
   (or set the role in Table editor → profiles). Admins sign in with Google and
   are the only accounts that can manage products, orders and photos.

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

### 4 · Telegram (order alerts via Supabase Edge Function)

Every paid order also alerts you on Telegram — the message is sent by a
**Supabase Edge Function** (your backend), never by the browser.

1. **Create your bot** — chat with [@BotFather](https://t.me/BotFather) on
   Telegram → `/newbot` → copy the **token**.
2. **Add the bot to your group** — open the group you want alerts in, add the
   bot as a member, then send any message in the group (so the bot sees it).
3. **Get the group chat id** — call
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and find the `chat.id` for
   your group (it's a negative number, e.g. `-1001234567890`).
4. **Deploy the edge function** with the Supabase CLI:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<group-chat-id> TELEGRAM_NOTIFY_SECRET=<long-random-string>
   supabase functions deploy telegram-notify
   ```
5. Add the **same** `TELEGRAM_NOTIFY_SECRET` to your Next.js environment
   (`.env.local` locally, Vercel → Project → Environment Variables in
   production). Each paid order POSTs to `app/api/telegram-notify`, which
   proxies it to the edge function with the shared secret — the bot token and
   chat id live only in Supabase secrets.

### 5 · Email (customer order emails via Resend)

Customers get an order confirmation email and a status email when you update
an order in the admin (e.g. "Your order is now shipped 🚚").

1. Create an account at [resend.com](https://resend.com) → **API Keys** → copy
   a key into `RESEND_API_KEY` (server-side only).
2. Set `EMAIL_FROM` (defaults to `SCENTURY21 <onboarding@resend.dev>`, which
   only delivers to your own address — add and verify a domain in Resend →
   **Domains** to send to customers).
3. Every paid order emails the customer via `app/api/email-notify`; the admin
   panel emails status changes automatically.

### 6 · Deploy to Vercel
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

### 7 · Email signup OTP (Supabase + Brevo custom SMTP)

Signup uses Supabase's email OTP (6-digit code) and a clickable confirmation
link. If you are NOT receiving the code:

1. Verify the sender in Brevo — Supabase silently drops emails when the sender
   address is not a verified sender in Brevo. Add it under Brevo → Senders &
   IPs → Senders, and use that exact address in the Supabase SMTP sender field.
2. Check the SMTP settings in Supabase → Authentication → SMTP:
   - Host: smtp-relay.brevo.com · Port: 587 · TLS on
   - User: your Brevo SMTP login (NOT the API key)
   - Pass: your Brevo SMTP master key (NOT the API key)
3. Add the redirect URL in Supabase → Authentication → URL Configuration — the
   site URL (e.g. https://your-app.vercel.app) and
   https://your-app.vercel.app/auth/callback in Redirect URLs.
4. Check spam/promotions. The OTP page also shows these hints to customers.

### 8 · Telegram admin AI agent (Groq)

Talk to your store in plain English on Telegram: view & update orders, change
customer tracking status, add products with photos, edit/delete products, and
check stats. Backed by Groq's LLM with tool calling.

1. Get a free key at https://console.groq.com → API Keys.
2. Get your chat id (TELEGRAM_CHAT_ID already used for order alerts works).
3. Set secrets + deploy:
   supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_ADMIN_CHAT_ID=<your-chat-id> GROQ_API_KEY=<groq-key> TELEGRAM_AGENT_SECRET=<long-random-string>
   supabase functions deploy telegram-agent
4. Point Telegram at the function (run once, anytime after deploy):
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ref>.supabase.co/functions/v1/telegram-agent&secret_token=<TELEGRAM_AGENT_SECRET>"
5. Chat with your bot: "Show my recent orders", "Set SC-XXXX to shipped",
   "Add Amber Oud for 385000, 100ml, stock 10" (send a photo first to add it
   as the product picture), "Stats", "Delete the product 'Old Scent'".

Only chat ids listed in TELEGRAM_ADMIN_CHAT_ID can use the bot.

> Schema: after pulling this update, run the WHOLE supabase/schema.sql in the
> Supabase SQL editor — it adds the bot_drafts table, the guest-order RPCs and
> the RLS policies that keep each customer's tracking page scoped to their own
> orders.

### 9 · Telegram bot — full command list

The AI bot can now do (owner-only writes, group = read-only):

- Orders: list/get, change status, mark paid/failed/refunded, needs-attention
  summary, CSV export (sends the file to chat).
- Products: add (with photo), edit, delete (permanent), quick restock,
  best sellers, most-wishlisted.
- Money: revenue today/week/month, top customers, stats.
- Settings: view/update site settings (WhatsApp number, socials, etc.).
- Daily 8am report: orders + revenue + low stock (telegram-daily-report).

Update the daily-report cron if your schedule differs:
  select cron.schedule('telegram-daily-report','0 8 * * *',
    $$select net.http_post(url:='https://<ref>.supabase.co/functions/v1/telegram-daily-report',headers:='{"authorization":"Bearer <TELEGRAM_AGENT_SECRET>"}'::jsonb)$$);

### 10 · Switching the bot's AI provider (free tier rate limits)

The bot is provider-agnostic — it calls any OpenAI-compatible `/chat/completions`
endpoint. Set three secrets to switch (Groq stays the default fallback):

**Google Gemini (recommended free tier — 1,500 req/day):**
  supabase secrets set LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai LLM_MODEL=gemini-2.0-flash LLM_API_KEY=<gemini-key>
  (key from https://aistudio.google.com/apikey — free)

**OpenRouter (free models):**
  supabase secrets set LLM_BASE_URL=https://openrouter.ai/api/v1 LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free LLM_API_KEY=<openrouter-key>

**NVIDIA NIM:**
  supabase secrets set LLM_BASE_URL=https://integrate.api.nvidia.com/v1 LLM_MODEL=meta/llama-3.3-70b-instruct LLM_API_KEY=<nvidia-key>

**Cerebras:**
  supabase secrets set LLM_BASE_URL=https://api.cerebras.ai/v1 LLM_MODEL=llama-3.3-70b LLM_API_KEY=<cerebras-key>

After changing secrets, redeploy so the function picks them up:
  supabase functions deploy telegram-agent

### 11 · Rotating AI providers (auto-fallback when one runs out)

The bot round-robins through every provider that has a key set, and if one
is rate-limited (429) or down (5xx) it automatically tries the next:

  Groq/custom -> Gemini -> OpenRouter -> NVIDIA -> Cerebras -> HuggingFace

Set any combination (all are optional; Groq stays the default):
  supabase secrets set GEMINI_API_KEY=<key>
  supabase secrets set OPENROUTER_API_KEY=<key>
  supabase secrets set NVIDIA_API_KEY=<key>
  supabase secrets set CEREBRAS_API_KEY=<key>
  supabase secrets set HUGGINGFACE_API_KEY=<key>

Custom single-provider override (optional):
  supabase secrets set LLM_BASE_URL=... LLM_MODEL=... LLM_API_KEY=...

After changing secrets, redeploy:  supabase functions deploy telegram-agent

### 12 · Bot screenshots + CSV fix

- CSV export now uploads the file bytes straight to Telegram (multipart) — no
  storage bucket involved, so it always delivers.
- Screenshots: the bot can send you an image of any admin page
  (orders / products / customers / stats) via the free Microlink API
  (~25/day). The images come from server-rendered /report/{section} pages
  gated by the REPORT_KEY secret.

Required env (Vercel):
  REPORT_KEY=<same value as the Supabase secret>   # gates /report pages
  SUPABASE_SERVICE_ROLE_KEY=<already set>          # /report fetches data

Bot secrets (Supabase):
  supabase secrets set SITE_URL=https://your-domain.vercel.app REPORT_KEY=<key>

Usage in Telegram: "Screenshot the orders page" · "Export orders as CSV"
