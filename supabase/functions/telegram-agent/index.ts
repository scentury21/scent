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
  await sb(`/rest/v1/products?id=eq.${p.id}`, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
  });
  return `🚫 "${p.name}" is now hidden from the shop (soft delete — it stays in the database).`;
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
      description: "Hide a product from the shop (soft delete) by its name.",
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
];

type ToolArgs = Record<string, unknown>;
const TOOL_IMPLS: Record<string, (a: ToolArgs) => Promise<string>> = {
  list_orders: listOrders as (a: ToolArgs) => Promise<string>,
  get_order: getOrder as (a: ToolArgs) => Promise<string>,
  update_order_status: updateOrderStatus as (a: ToolArgs) => Promise<string>,
  list_products: listProducts as (a: ToolArgs) => Promise<string>,
  add_product: addProduct as (a: ToolArgs) => Promise<string>,
  update_product: updateProduct as (a: ToolArgs) => Promise<string>,
  delete_product: deleteProduct as (a: ToolArgs) => Promise<string>,
  get_stats: getStats as (a: ToolArgs) => Promise<string>,
};

const SYSTEM_PROMPT = `You are the SCENTURY21 store manager bot. The owner talks to you in plain language and you run tools against their store (Supabase).

Rules:
- Be friendly, concise and helpful. Use emojis sparingly.
- When the owner asks to update an order's status or add/edit/delete a product, DO IT via the tools — do not just describe it.
- If a photo was attached to the conversation, the owner wants it as the product photo — pass the provided photo URL as image_url when adding/editing the product.
- Prices in the store are in Nigerian naira (₦). Convert prices to price_naira.
- If the request is ambiguous (e.g. several products match), ask ONE clarifying question instead of guessing.
- Never invent data that a tool did not return.`;

async function runAgent(
  chatId: number,
  userText: string,
  photoUrl: string | null,
  draftJson: Record<string, unknown>
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
        const impl = TOOL_IMPLS[name];
        let result = `Unknown tool: ${name}`;
        if (impl) {
          try {
            result = await impl(args);
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

  // Admin-only. Fail CLOSED: without an allowlist the bot refuses to act.
  const admins = (Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!admins.length || !admins.includes(String(fromId ?? chatId))) {
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
        "• “Show my recent orders”",
        "• “Set order SC-XXXX to shipped”",
        "• “Add a perfume called Amber Oud for ₦385,000, 100ml, stock 10”",
        "• “Send me a photo + details to add a product with a picture”",
        "• “What's the revenue?” / “Stats”",
        "• “Find the product 'Rose'” / “Edit its price to 50000”",
        "• “Delete the product 'Old Scent'”",
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
  const reply = await runAgent(chatId, prompt, photoUrl, draft);

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
