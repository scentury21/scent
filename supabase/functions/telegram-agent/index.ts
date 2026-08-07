// Supabase Edge Function: telegram-agent
//
// An AI-powered admin bot for SCENTURY21. You talk to your store in plain
// English on Telegram and the bot (backed by Groq's LLM with tool calling)
// reads and manages your store: orders, status updates, products (with
// photos!), stats and more.
//
// Deploy:
//   supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_ADMIN_CHAT_ID=<your-chat-id> \
//     GROQ_API_KEY=<key> TELEGRAM_AGENT_SECRET=<long-random-string>
//   supabase functions deploy telegram-agent
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ref>.supabase.co/functions/v1/telegram-agent&secret_token=<TELEGRAM_AGENT_SECRET>"
//
// Only the chat ids listed in TELEGRAM_ADMIN_CHAT_ID (comma-separated) may
// use the bot — everyone else gets a polite "not authorized".

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TELEGRAM_API = "https://api.telegram.org";
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_AGENT_ROUNDS = 6;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* ------------------------------------------------------------------ */
/* Supabase REST via the service role key (bypasses RLS — server only) */
/* ------------------------------------------------------------------ */

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function sb(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${SB_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Telegram helpers                                                    */
/* ------------------------------------------------------------------ */

async function tg(method: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** Download a Telegram photo and store it in Supabase Storage. Returns the public URL. */
async function uploadPhoto(fileId: string): Promise<string> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const file = await tg("getFile", { file_id: fileId });
  const filePath = file?.result?.file_path;
  if (!filePath) throw new Error("could not resolve photo file");

  const bytes = await fetch(`${TELEGRAM_API}/file/bot${token}/${filePath}`).then(
    (r) => r.arrayBuffer()
  );
  const ext = filePath.split(".").pop() ?? "jpg";
  const name = `bot-${Date.now()}.${ext}`;

  const res = await fetch(`${SB_URL}/storage/v1/object/product-images/${name}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`storage upload ${res.status}`);
  return `${SB_URL}/storage/v1/object/public/product-images/${name}`;
}

/* ------------------------------------------------------------------ */
/* Tool implementations (admin actions)                                */
/* ------------------------------------------------------------------ */

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAY_STATUSES = ["pending", "paid", "failed", "refunded"];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `product-${Date.now()}`;
}

async function listOrders(args: { status?: string; limit?: number }) {
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
  let path = `/rest/v1/orders?select=order_number,customer_name,customer_phone,status,payment_status,total_kobo,created_at&order=created_at.desc&limit=${limit}`;
  if (args.status && STATUSES.includes(args.status.toLowerCase())) {
    path += `&status=eq.${args.status.toLowerCase()}`;
  }
  const rows = await sb(path);
  if (!rows.length) return `No orders${args.status ? ` with status "${args.status}"` : ""} found.`;
  return rows
    .map(
      (o: Record<string, unknown>) =>
        `• ${o.order_number} — ${o.customer_name} (${o.customer_phone}) — ` +
        `${o.status} / ${o.payment_status} — ₦${((o.total_kobo as number) / 100).toLocaleString()}`
    )
    .join("\n");
}

async function getOrder(args: { order_number: string }) {
  const rows = await sb(
    `/rest/v1/orders?select=*&order_number=eq.${encodeURIComponent(args.order_number)}`
  );
  const order = rows?.[0];
  if (!order) return `No order found for ${args.order_number}.`;
  const items = await sb(
    `/rest/v1/order_items?select=name,size,price_kobo,qty&order_id=eq.${order.id}`
  );
  const lines = (items as Record<string, unknown>[])
    .map(
      (i) =>
        `• ${i.name}${i.size ? ` (${i.size})` : ""} × ${i.qty} — ₦${((i.price_kobo as number) / 100).toLocaleString()}`
    )
    .join("\n");
  return [
    `Order ${order.order_number}`,
    `Customer: ${order.customer_name} · ${order.customer_phone} · ${order.customer_email}`,
    `Status: ${order.status} | Payment: ${order.payment_status}`,
    `Total: ₦${((order.total_kobo as number) / 100).toLocaleString()}`,
    ``,
    `Items:\n${lines || "—"}`,
    `Deliver to: ${order.delivery_address}, ${order.delivery_city}, ${order.delivery_region} ${order.delivery_country}`,
  ].join("\n");
}

async function updateOrderStatus(args: { order_number: string; status: string }) {
  if (!args.status) {
    return `Which status? Use one of: ${STATUSES.join(", ")}.`;
  }
  const status = args.status.toLowerCase();
  if (!STATUSES.includes(status)) {
    return `Invalid status. Use one of: ${STATUSES.join(", ")}.`;
  }
  const rows = await sb(
    `/rest/v1/orders?select=id&order_number=eq.${encodeURIComponent(args.order_number)}`
  );
  const order = rows?.[0];
  if (!order) return `No order found for ${args.order_number}.`;

  await sb(`/rest/v1/orders?id=eq.${order.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  });

  // Best-effort customer email through the Next.js app if a site URL is set.
  const siteUrl = Deno.env.get("SITE_URL");
  if (siteUrl) {
    const row = await sb(`/rest/v1/orders?select=*&id=eq.${order.id}`);
    const o = row?.[0];
    if (o) {
      fetch(`${siteUrl}/api/email-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            order_number: o.order_number,
            customer_name: o.customer_name,
            customer_email: o.customer_email,
            total_kobo: o.total_kobo,
            currency: "NGN",
          },
          status,
        }),
      }).catch(() => {});
    }
  }

  return `✅ Order ${args.order_number} updated: ${status}. The customer now sees the new status on the tracking page.`;
}

async function listProducts(args: { query?: string; category?: string; limit?: number }) {
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
  let path = `/rest/v1/products?select=name,slug,category,price_kobo,stock,active&order=created_at.desc&limit=${limit}`;
  if (args.category) path += `&category=ilike.*${encodeURIComponent(args.category)}*`;
  const rows = await sb(path);
  if (!rows.length) return "No products found.";
  let text = rows
    .map(
      (p: Record<string, unknown>) =>
        `${p.active === false ? "🚫 " : ""}• ${p.name} — ₦${((p.price_kobo as number) / 100).toLocaleString()} — ${p.category} — stock ${p.stock}`
    )
    .join("\n");
  if (args.query) {
    const q = args.query.toLowerCase();
    const filtered = rows.filter(
      (p: Record<string, unknown>) =>
        String(p.name).toLowerCase().includes(q) ||
        String(p.category).toLowerCase().includes(q)
    );
    if (filtered.length) {
      text = `Found ${filtered.length} matching "${args.query}":\n` + filtered
        .map(
          (p: Record<string, unknown>) =>
            `• ${p.name} — ₦${((p.price_kobo as number) / 100).toLocaleString()} — ${p.category} — stock ${p.stock}`
        )
        .join("\n");
    } else {
      text += `\n\nNo match for "${args.query}".`;
    }
  }
  return text;
}

async function addProduct(args: {
  name: string;
  price_naira: number;
  category?: string;
  size?: string;
  stock?: number;
  description?: string;
  notes_top?: string;
  notes_heart?: string;
  notes_base?: string;
  image_url?: string;
}) {
  const name = (args.name ?? "").trim();
  const price = Number(args.price_naira);
  if (!name) return "The product needs a name.";
  if (!Number.isFinite(price) || price <= 0) {
    return "The product needs a price in naira (e.g. 45000).";
  }

  const row = {
    slug: slugify(name),
    name,
    subtitle: "",
    description: args.description ?? "",
    category: args.category || "Spray Perfumes",
    family: "",
    size: args.size || "100ml",
    price_kobo: Math.round(price * 100),
    stock: Number.isFinite(Number(args.stock)) ? Number(args.stock) : 10,
    image_url: args.image_url ?? "",
    notes_top: args.notes_top ? args.notes_top.split(",").map((s) => s.trim()).filter(Boolean) : [],
    notes_heart: args.notes_heart ? args.notes_heart.split(",").map((s) => s.trim()).filter(Boolean) : [],
    notes_base: args.notes_base ? args.notes_base.split(",").map((s) => s.trim()).filter(Boolean) : [],
    active: true,
  };

  // A duplicate slug would break the unique constraint — make it unique.
  try {
    const existing = await sb(`/rest/v1/products?select=slug&slug=eq.${row.slug}`);
    if (existing?.length) row.slug = `${row.slug}-${Date.now().toString(36)}`;
  } catch {
    /* ignore */
  }

  const created = await sb("/rest/v1/products", {
    method: "POST",
    body: JSON.stringify(row),
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
  });
  const p = created?.[0] ?? created;
  return `✅ Added "${p.name}" — ₦${(p.price_kobo / 100).toLocaleString()} (${p.category}, ${p.size}, stock ${p.stock}).\n${p.image_url ? `Photo: ${p.image_url}` : "No photo attached."}`;
}

async function updateProduct(args: { query: string; [k: string]: unknown }) {
  const rows = await sb(
    `/rest/v1/products?select=*&name=ilike.*${encodeURIComponent(args.query)}*`
  );
  const p = rows?.[0];
  if (!p) return `No product found matching "${args.query}".`;

  const patch: Record<string, unknown> = {};
  if (args.name) patch.name = String(args.name);
  if (args.price_naira) patch.price_kobo = Math.round(Number(args.price_naira) * 100);
  if (args.stock !== undefined) patch.stock = Number(args.stock);
  if (args.category) patch.category = String(args.category);
  if (args.size) patch.size = String(args.size);
  if (args.description) patch.description = String(args.description);
  if (args.subtitle) patch.subtitle = String(args.subtitle);
  if (args.image_url) patch.image_url = String(args.image_url);
  if (args.active !== undefined) patch.active = Boolean(args.active);

  if (!Object.keys(patch).length) return "Nothing to change — send at least one field.";

  await sb(`/rest/v1/products?id=eq.${p.id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  });
  return `✅ Updated "${p.name}".${patch.price_kobo ? ` New price: ₦${(patch.price_kobo / 100).toLocaleString()}.` : ""}`;
}

async function deleteProduct(args: { query: string }) {
  const rows = await sb(
    `/rest/v1/products?select=*&name=ilike.*${encodeURIComponent(args.query)}*`
  );
  const p = rows?.[0];
  if (!p) return `No product found matching "${args.query}".`;
  // HARD delete — matches the admin panel's Delete button, so the product
  // disappears from BOTH the shop and the admin products page.
  await sb(`/rest/v1/products?id=eq.${p.id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  return `🗑️ Deleted "${p.name}" permanently (removed from the shop and admin).`;
}

async function getStats() {
  const orders = (await sb(
    "/rest/v1/orders?select=total_kobo,payment_status,status,created_at&order=created_at.desc&limit=1000"
  )) as Record<string, unknown>[];
  const products = (await sb(
    "/rest/v1/products?select=name,stock,active"
  )) as Record<string, unknown>[];

  const paid = orders.filter((o) => o.payment_status === "paid");
  const revenue = paid.reduce((s, o) => s + Number(o.total_kobo ?? 0), 0) / 100;
  const byStatus = new Map<string, number>();
  for (const o of orders) byStatus.set(String(o.status), (byStatus.get(String(o.status)) ?? 0) + 1);
  const lowStock = products.filter((p) => p.active !== false && Number(p.stock) <= 5);

  return [
    `📊 SCENTURY21 dashboard`,
    `Orders: ${orders.length} (${paid.length} paid)`,
    `Revenue (paid): ₦${revenue.toLocaleString()}`,
    `Status: ${[...byStatus.entries()].map(([s, n]) => `${s} ${n}`).join(", ")}`,
    `Products: ${products.filter((p) => p.active !== false).length} live, ${lowStock.length} low-stock (≤5)`,
    lowStock.length
      ? `⚠️ Low stock: ${lowStock.map((p) => String((p as Record<string, unknown>).name)).join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* New tools: attention, payments, customers, revenue, CSV, restock    */
/* ------------------------------------------------------------------ */

async function needsAttention() {
  const orders = (await sb(
    "/rest/v1/orders?select=order_number,customer_name,customer_phone,status,payment_status,created_at,total_kobo&order=created_at.desc&limit=500"
  )) as Record<string, unknown>[];
  const products = (await sb(
    "/rest/v1/products?select=name,stock,active"
  )) as Record<string, unknown>[];

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const unpaid = orders.filter((o) => o.payment_status !== "paid");
  const stale = orders.filter(
    (o) => o.status === "pending" && now - new Date(String(o.created_at)).getTime() > 2 * DAY
  );
  const low = products.filter((p) => p.active !== false && Number(p.stock) <= 5);

  if (!unpaid.length && !stale.length && !low.length) {
    return "🎉 All clear! No unpaid orders, no stale pending orders, no low stock.";
  }
  return [
    "⚠️ Needs attention:",
    unpaid.length ? `💳 Unpaid (${unpaid.length}): ${unpaid.map((o) => o.order_number).join(", ")}` : "",
    stale.length ? `⏳ Pending >48h (${stale.length}): ${stale.map((o) => o.order_number).join(", ")}` : "",
    low.length ? `📉 Low stock ≤5: ${low.map((p) => `${p.name} (${p.stock})`).join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function updatePaymentStatus(args: { order_number: string; status: string }) {
  const status = String(args.status ?? "").toLowerCase();
  if (!PAY_STATUSES.includes(status)) {
    return `Invalid payment status. Use one of: ${PAY_STATUSES.join(", ")}.`;
  }
  const rows = await sb(
    `/rest/v1/orders?select=id&order_number=eq.${encodeURIComponent(args.order_number)}`
  );
  const order = rows?.[0];
  if (!order) return `No order found for ${args.order_number}.`;
  await sb(`/rest/v1/orders?id=eq.${order.id}`, {
    method: "PATCH",
    body: JSON.stringify({ payment_status: status, updated_at: new Date().toISOString() }),
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  });
  return `✅ Order ${args.order_number}: payment → ${status}.`;
}

async function findCustomer(args: { query: string }) {
  const q = String(args.query ?? "").trim();
  if (!q) return "Tell me the customer's email or phone to look them up.";
  const rows = (await sb(
    `/rest/v1/orders?select=order_number,customer_name,customer_email,customer_phone,total_kobo,payment_status,status,created_at&or=(customer_email.ilike.*${encodeURIComponent(q)}*,customer_phone.ilike.*${encodeURIComponent(q)}*,customer_name.ilike.*${encodeURIComponent(q)}*)&order=created_at.desc&limit=100`
  )) as Record<string, unknown>[];
  if (!rows.length) return `No customer found matching "${q}".`;
  const paid = rows.filter((o) => o.payment_status === "paid");
  const spent = paid.reduce((s, o) => s + Number(o.total_kobo ?? 0), 0) / 100;
  const c = rows[0];
  const recent = rows
    .slice(0, 5)
    .map((o) => `• ${o.order_number} — ${o.status} / ${o.payment_status} — ₦${((o.total_kobo as number) / 100).toLocaleString()}`)
    .join("\n");
  return [
    `👤 ${c.customer_name}`,
    `📧 ${c.customer_email}`,
    `📱 ${c.customer_phone}`,
    `Orders: ${rows.length} (${paid.length} paid) · Total spent: ₦${spent.toLocaleString()}`,
    ``,
    `Recent:\n${recent}`,
  ].join("\n");
}

async function revenueReport(args: { period?: string }) {
  const period = String(args.period ?? "today").toLowerCase();
  const now = new Date();
  let from: Date;
  if (period.startsWith("month")) {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period.startsWith("week")) {
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const fromIso = from.toISOString();
  const orders = (await sb(
    `/rest/v1/orders?select=total_kobo,payment_status,created_at&payment_status=eq.paid&created_at=gte.${fromIso}&limit=2000`
  )) as Record<string, unknown>[];
  const revenue = orders.reduce((s, o) => s + Number(o.total_kobo ?? 0), 0) / 100;
  return `💰 Revenue (${period}): ₦${revenue.toLocaleString()} from ${orders.length} paid order${orders.length === 1 ? "" : "s"}.`;
}

async function bestProducts(args: { limit?: number }) {
  const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);
  const orders = (await sb(
    "/rest/v1/orders?select=id&payment_status=eq.paid&limit=2000"
  )) as Record<string, unknown>[];
  const ids = orders.map((o) => String(o.id));
  if (!ids.length) return "No paid orders yet — best sellers will show once orders are paid.";
  const items = (await sb(
    `/rest/v1/order_items?select=name,qty,price_kobo,order_id&order_id=in.(${ids.join(",")})&limit=2000`
  )) as Record<string, unknown>[];
  const byName = new Map<string, { qty: number; revenue: number }>();
  for (const i of items) {
    const name = String(i.name);
    const cur = byName.get(name) ?? { qty: 0, revenue: 0 };
    cur.qty += Number(i.qty ?? 0);
    cur.revenue += (Number(i.price_kobo ?? 0) * Number(i.qty ?? 0)) / 100;
    byName.set(name, cur);
  }
  const sorted = [...byName.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, limit);
  if (!sorted.length) return "No sales yet.";
  return (
    `🏆 Best sellers (by revenue):\n` +
    sorted
      .map(
        ([name, s], i) =>
          `${i + 1}. ${name} — ${s.qty} sold — ₦${s.revenue.toLocaleString()}`
      )
      .join("\n")
  );
}

async function quickRestock(args: { query: string; qty?: number }) {
  const qty = Number(args.qty);
  if (!Number.isFinite(qty) || qty <= 0) {
    return "Tell me the quantity to add, e.g. \"add 10 to stock of Amber Oud\".";
  }
  const rows = await sb(
    `/rest/v1/products?select=id,name,stock&name=ilike.*${encodeURIComponent(String(args.query))}*`
  );
  const p = rows?.[0];
  if (!p) return `No product found matching "${args.query}".`;
  const next = Number(p.stock) + qty;
  await sb(`/rest/v1/products?id=eq.${p.id}`, {
    method: "PATCH",
    body: JSON.stringify({ stock: next }),
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  });
  return `📦 ${p.name}: stock ${p.stock} → ${next}.`;
}

async function topCustomers(args: { limit?: number }) {
  const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);
  const orders = (await sb(
    "/rest/v1/orders?select=customer_name,customer_email,customer_phone,total_kobo,payment_status&payment_status=eq.paid&limit=2000"
  )) as Record<string, unknown>[];
  const byEmail = new Map<string, { name: string; spent: number; count: number }>();
  for (const o of orders) {
    const email = String(o.customer_email || "unknown");
    const cur = byEmail.get(email) ?? {
      name: String(o.customer_name || email),
      spent: 0,
      count: 0,
    };
    cur.spent += Number(o.total_kobo ?? 0) / 100;
    cur.count += 1;
    byEmail.set(email, cur);
  }
  const sorted = [...byEmail.values()].sort((a, b) => b.spent - a.spent).slice(0, limit);
  if (!sorted.length) return "No paid customers yet.";
  return (
    `👑 Top customers:\n` +
    sorted
      .map(
        (c, i) =>
          `${i + 1}. ${c.name} — ₦${c.spent.toLocaleString()} (${c.count} order${c.count === 1 ? "" : "s"})`
      )
      .join("\n")
  );
}

async function mostWishlisted(args: { limit?: number }) {
  const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 10);
  const wish = (await sb(
    "/rest/v1/wishlist?select=product_id&limit=5000"
  )) as Record<string, unknown>[];
  const count = new Map<string, number>();
  for (const w of wish) count.set(String(w.product_id), (count.get(String(w.product_id)) ?? 0) + 1);
  const ids = [...count.keys()];
  if (!ids.length) return "No wishlists yet.";
  const products = (await sb(
    `/rest/v1/products?select=id,name&id=in.(${ids.join(",")})&limit=2000`
  )) as Record<string, unknown>[];
  const nameById = new Map(products.map((p) => [String(p.id), String(p.name)]));
  const sorted = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  return (
    `💛 Most wishlisted:\n` +
    sorted
      .map(([id, n], i) => `${i + 1}. ${nameById.get(id) ?? "unknown"} — ${n} wish${n === 1 ? "" : "es"}`)
      .join("\n")
  );
}

async function siteSettings() {
  const rows = (await sb(
    "/rest/v1/site_settings?select=key,value&limit=50"
  )) as Record<string, unknown>[];
  if (!rows.length) return "No site settings found.";
  return rows.map((r) => `• ${r.key}: ${r.value}`).join("\n");
}

async function updateSiteSetting(args: { key: string; value: string }) {
  const key = String(args.key ?? "").trim();
  const value = String(args.value ?? "").trim();
  if (!key || !value) return "Tell me the setting key and new value (e.g. \"set whatsapp_number to 2348028383053\").";
  const existing = await sb(
    `/rest/v1/site_settings?select=key&key=eq.${encodeURIComponent(key)}`
  );
  if (existing?.length) {
    await sb(`/rest/v1/site_settings?key=eq.${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    });
  } else {
    await sb("/rest/v1/site_settings", {
      method: "POST",
      body: JSON.stringify({ key, value }),
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    });
  }
  return `✅ ${key} → ${value}`;
}

async function exportOrdersCsv(ctx: { chatId: number }) {
  const orders = (await sb(
    "/rest/v1/orders?select=order_number,created_at,customer_name,customer_email,customer_phone,status,payment_status,total_kobo,delivery_country,delivery_city&order=created_at.desc&limit=2000"
  )) as Record<string, unknown>[];
  if (!orders.length) return "No orders to export yet.";
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    ["order_number", "created_at", "customer_name", "customer_email", "customer_phone", "status", "payment_status", "total_kobo", "delivery_country", "delivery_city"].join(","),
    ...orders.map((o) =>
      [
        o.order_number,
        o.created_at,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.status,
        o.payment_status,
        o.total_kobo,
        o.delivery_country,
        o.delivery_city,
      ]
        .map(esc)
        .join(",")
    ),
  ].join("\n");

  // Upload CSV to storage, then send the document by URL (Telegram fetches it).
  const name = `orders-${Date.now()}.csv`;
  const up = await fetch(`${SB_URL}/storage/v1/object/product-images/${name}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "text/csv",
      "x-upsert": "true",
    },
    body: csv,
  });
  if (!up.ok) return `⚠️ Could not build the CSV (storage ${up.status}).`;
  const fileUrl = `${SB_URL}/storage/v1/object/public/product-images/${name}`;
  const sent = await tg("sendDocument", {
    chat_id: ctx.chatId,
    document: fileUrl,
    caption: `📄 ${orders.length} orders — Scentury21 export`,
  });
  if (!sent?.ok) return `⚠️ CSV is ready but Telegram couldn't send it: ${sent?.description ?? "error"}`;
  return `📄 Sent you a CSV with ${orders.length} orders.`;
}

/* ------------------------------------------------------------------ */
/* Groq agent loop                                                     */
/* ------------------------------------------------------------------ */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_orders",
      description:
        "List recent orders, optionally filtered by status (pending, processing, shipped, delivered, cancelled).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Optional status filter" },
          limit: { type: "number", description: "How many orders (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order",
      description: "Get full details of one order by its order number (e.g. SC-XXXX).",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string" },
        },
        required: ["order_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_order_status",
      description:
        "Update a customer's order status. The customer sees it on their tracking page immediately.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string" },
          status: {
            type: "string",
            enum: STATUSES,
            description: "New status",
          },
        },
        required: ["order_number", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_products",
      description: "List or search products in the store.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional name/category search" },
          category: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_product",
      description:
        "Add a new product to the store. price_naira is the price in naira (e.g. 45000 for ₦45,000).",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          price_naira: { type: "number" },
          category: { type: "string", description: "e.g. Spray Perfumes / Oil Perfumes" },
          size: { type: "string", description: "e.g. 100ml" },
          stock: { type: "number" },
          description: { type: "string" },
          notes_top: { type: "string", description: "comma-separated top notes" },
          notes_heart: { type: "string", description: "comma-separated heart notes" },
          notes_base: { type: "string", description: "comma-separated base notes" },
          image_url: { type: "string", description: "photo URL if a photo was sent" },
        },
        required: ["name", "price_naira"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_product",
      description:
        "Edit a product (price, stock, name, category, size, description, image). Find it by name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name of the product to edit" },
          name: { type: "string" },
          price_naira: { type: "number" },
          stock: { type: "number" },
          category: { type: "string" },
          size: { type: "string" },
          description: { type: "string" },
          image_url: { type: "string" },
          active: { type: "boolean" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_product",
      description: "Permanently delete a product by its name (removed from the shop AND the admin panel).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stats",
      description: "Store dashboard: orders, revenue, status breakdown, low stock.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "needs_attention",
      description:
        "What needs the owner's attention: unpaid orders, pending orders older than 48h, and products with stock <= 5.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_payment_status",
      description: "Mark an order's payment as paid, failed or refunded (e.g. bank transfer received).",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string" },
          status: { type: "string", enum: PAY_STATUSES },
        },
        required: ["order_number", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_customer",
      description:
        "Find a customer by email, phone or name and show their orders and total spent.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "email / phone / name" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "revenue_report",
      description: "Revenue from paid orders for a period (today, week or month).",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "week", "month"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "best_products",
      description: "Best-selling products by units sold and revenue from paid orders.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "quick_restock",
      description: "Add stock to a product by its name (e.g. \"add 10 to Amber Oud\").",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "product name" },
          qty: { type: "number", description: "how many units to add" },
        },
        required: ["query", "qty"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "top_customers",
      description: "Top customers by total spent (paid orders only).",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "most_wishlisted",
      description: "Products most added to wishlists.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "site_settings",
      description: "Show site settings (WhatsApp number, social links, etc.).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_site_setting",
      description: "Update a site setting by key (e.g. whatsapp_number, instagram).",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "export_orders_csv",
      description: "Export all orders as a CSV file sent to the chat.",
      parameters: { type: "object", properties: {} },
    },
  },
];

type ToolArgs = Record<string, unknown>;
type ToolCtx = { chatId: number };
const TOOL_IMPLS: Record<string, (a: ToolArgs, ctx: ToolCtx) => Promise<string>> = {
  list_orders: listOrders as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  get_order: getOrder as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  update_order_status: updateOrderStatus as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  list_products: listProducts as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  add_product: addProduct as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  update_product: updateProduct as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  delete_product: deleteProduct as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  get_stats: getStats as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  needs_attention: needsAttention as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  update_payment_status: updatePaymentStatus as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  find_customer: findCustomer as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  revenue_report: revenueReport as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  best_products: bestProducts as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  quick_restock: quickRestock as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  top_customers: topCustomers as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  most_wishlisted: mostWishlisted as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  site_settings: siteSettings as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  update_site_setting: updateSiteSetting as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
  export_orders_csv: exportOrdersCsv as (a: ToolArgs, ctx: ToolCtx) => Promise<string>,
};

// Write tools change the store (products, order statuses). These are owner-
// only, so other members of a group can read but never mutate.
const OWNER_ONLY_TOOLS = new Set([
  "update_order_status",
  "add_product",
  "update_product",
  "delete_product",
  "update_payment_status",
  "quick_restock",
  "update_site_setting",
]);

const SYSTEM_PROMPT = `You are the SCENTURY21 store manager bot. The owner talks to you in plain language and you run tools against their store (Supabase).

Rules:
- Be friendly, concise and helpful. Use emojis sparingly.
- When the owner asks to update an order's status or add/edit/delete a product, DO IT via the tools — do not just describe it.
- If a photo was attached to the conversation, the owner wants it as the product photo — pass the provided photo URL as image_url when adding/editing the product.
- Prices in the store are in Nigerian naira (₦). Convert prices to price_naira.
- If the request is ambiguous (e.g. several products match), ask ONE clarifying question instead of guessing.
- Never invent data that a tool did not return.
- If the system tells you an action was blocked because only the store owner can do it, politely explain that to the user and offer read-only alternatives — do not argue or try to bypass it.
- You can also: summarize what needs attention, mark payments paid/failed/refunded, look up customers, report revenue by day/week/month, list best sellers, restock products, show top customers, most-wishlisted products, read/update site settings, and export orders as CSV (the CSV tool sends the file itself).`;

async function runAgent(
  chatId: number,
  userText: string,
  photoUrl: string | null,
  draftJson: Record<string, unknown>,
  isOwner: boolean
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? "";
  if (!apiKey) return "⚠️ GROQ_API_KEY is not configured yet — set it with `supabase secrets set GROQ_API_KEY=<key>`.";

  // A photo from THIS message wins; otherwise reuse one stashed from an
  // earlier message (the product-add wizard across turns).
  const effectivePhoto =
    photoUrl ?? (typeof draftJson.last_photo_url === "string" ? draftJson.last_photo_url : null);

  const messages: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: effectivePhoto
        ? `A photo is available for this product — use this URL as image_url: ${effectivePhoto}`
        : "No photo is available — add the product without an image.",
    },
    { role: "user", content: userText },
  ];

  // Carry over partial product details from a previous turn (the wizard).
  if (draftJson && Object.keys(draftJson).length) {
    messages.push({
      role: "system",
      content: `In-progress product draft (from an earlier message): ${JSON.stringify(draftJson)}. Use it to fill in add_product fields.`,
    });
  }

  for (let round = 0; round < MAX_AGENT_ROUNDS; round++) {
    const res = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return `⚠️ Groq error (${res.status}): ${text.slice(0, 200)}`;
    }
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;

    if (msg?.tool_calls?.length) {
      messages.push(msg);
      for (const call of msg.tool_calls) {
        const name = call.function?.name;
        let args: ToolArgs = {};
        try {
          args = JSON.parse(call.function?.arguments ?? "{}");
        } catch {
          /* keep {} */
        }
        // Owner gate for anything that mutates the store.
        if (OWNER_ONLY_TOOLS.has(name) && !isOwner) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content:
              "Blocked: this action changes the store and only the store owner may do it. Suggest the owner do it themselves, or answer the question read-only.",
          });
          continue;
        }
        const impl = TOOL_IMPLS[name];
        let result = `Unknown tool: ${name}`;
        if (impl) {
          try {
            result = await impl(args, { chatId });
          } catch (err) {
            result = `⚠️ Tool error: ${err instanceof Error ? err.message : String(err)}`;
          }
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
      continue;
    }

    return msg?.content?.trim() || "Done ✅";
  }

  return "I couldn't finish that in one go — please repeat the request.";
}

/* ------------------------------------------------------------------ */
/* Draft persistence (product-add wizard across messages)              */
/* ------------------------------------------------------------------ */

async function getDraft(chatId: number): Promise<Record<string, unknown>> {
  try {
    const rows = await sb(`/rest/v1/bot_drafts?select=data&chat_id=eq.${chatId}`);
    return (rows?.[0]?.data as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

async function saveDraft(chatId: number, data: Record<string, unknown>) {
  try {
    await sb("/rest/v1/bot_drafts", {
      method: "POST",
      body: JSON.stringify({
        chat_id: chatId,
        data,
        updated_at: new Date().toISOString(),
      }),
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
    });
  } catch {
    /* non-fatal */
  }
}

async function clearDraft(chatId: number) {
  try {
    await sb(`/rest/v1/bot_drafts?chat_id=eq.${chatId}`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
  } catch {
    /* non-fatal */
  }
}

/* ------------------------------------------------------------------ */
/* Webhook handler                                                     */
/* ------------------------------------------------------------------ */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  // Webhook secret — Telegram echoes this header only for the real bot.
  // Fail CLOSED: if the secret was never configured, refuse to serve rather
  // than accept fake updates from anyone who can reach this public URL.
  const expectedSecret = Deno.env.get("TELEGRAM_AGENT_SECRET") ?? "";
  if (!expectedSecret) {
    console.error("[telegram-agent] TELEGRAM_AGENT_SECRET is not configured");
    return json({ ok: false, error: "agent secret not configured" }, 503);
  }
  const providedSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (providedSecret !== expectedSecret) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const update = (await req.json().catch(() => ({}))) as {
    message?: {
      chat?: { id?: number };
      from?: { id?: number };
      text?: string;
      photo?: { file_id?: string }[];
      caption?: string;
    };
  };

  const chatId = update?.message?.chat?.id;
  const fromId = update?.message?.from?.id;
  const text = (update?.message?.text ?? update?.message?.caption ?? "").trim();

  if (!chatId) {
    return json({ ok: true, skipped: "no message" });
  }

  // Allowlist: the group chat id (anyone may tag the bot for read-only) and
  // the owner's personal chat id (full access). Fail CLOSED without an
  // allowlist.
  const admins = (Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // (owner ids resolved separately in the handler)
  const ownerIds = (Deno.env.get("TELEGRAM_OWNER_CHAT_ID") ??
    Deno.env.get("TELEGRAM_CHAT_ID") ??
    "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isOwner = ownerIds.includes(String(fromId ?? chatId));
  const isAdmin = admins.includes(String(chatId)) || admins.includes(String(fromId));
  if (!admins.length || !isAdmin) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "🔒 This bot is for the SCENTURY21 store owner only.",
    });
    return json({ ok: true, skipped: "non-admin" });
  }

  const isStart = text === "/start" || text === "/help";
  if (isStart) {
    await clearDraft(chatId);
    await tg("sendMessage", {
      chat_id: chatId,
      text: [
        "👋 Hey boss — SCENTURY21 admin bot here.",
        "",
        "Try things like:",
        "📦 Orders",
        "• “Show my recent orders” / “Orders by status”",
        "• “Set order SC-XXXX to shipped” / “Mark SC-XXXX as paid”",
        "• “What needs attention?”",
        "• “Export orders as CSV”",
        "🛍️ Products",
        "• “Add a perfume called Amber Oud for ₦385,000, 100ml, stock 10”",
        "• “Send me a photo + details to add a product with a picture”",
        "• “Find the product 'Rose'” / “Edit its price to 50000”",
        "• “Add 10 to stock of Amber Oud”",
        "• “Delete the product 'Old Scent'”",
        "💰 Money & customers",
        "• “Revenue this week” / “Best sellers” / “Top customers”",
        "• “Find customer samuel@mail.com” / “Most wishlisted”",
        "⚙️ Settings",
        "• “Site settings” / “Set whatsapp_number to 2348028383053”",
        "",
        "I'll update your store live. 🛍️",
      ].join("\n"),
    });
    return json({ ok: true });
  }

  // Photo attached → upload now, stash the URL, then let the agent continue.
  let photoUrl: string | null = null;
  const fileId = update?.message?.photo?.slice(-1)?.[0]?.file_id;
  if (fileId) {
    try {
      photoUrl = await uploadPhoto(fileId);
    } catch (err) {
      photoUrl = null;
      await tg("sendMessage", {
        chat_id: chatId,
        text: `⚠️ Could not upload the photo (${err instanceof Error ? err.message : "error"}). I'll continue without it.`,
      });
    }
  }

  const prompt = text || (photoUrl ? "Please add this product. Ask me for the details I'm missing." : "");
  if (!prompt) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "Send me a message or a photo and I'll manage your store. /help for ideas.",
    });
    return json({ ok: true });
  }

  const draft = await getDraft(chatId);
  const reply = await runAgent(chatId, prompt, photoUrl, draft, isOwner);

  // If the agent added a product successfully, clear any draft + photo refs.
  if (reply.startsWith("✅ Added")) {
    await clearDraft(chatId);
  } else if (photoUrl || (draft && Object.keys(draft).length)) {
    // Keep draft state so a follow-up message can finish the product add.
    await saveDraft(chatId, { ...draft, last_photo_url: photoUrl ?? draft.last_photo_url ?? "" });
  }

  await tg("sendMessage", { chat_id: chatId, text: reply });
  return json({ ok: true });
});
