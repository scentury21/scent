// Supabase Edge Function: telegram-notify
//
// Receives a paid order from the storefront (via app/api/telegram-notify) and
// sends a formatted alert to the owner's Telegram chat/group using the
// Telegram Bot API. Secrets (bot token, chat id, shared secret) live only in
// Supabase secrets — never in the browser.
//
// Deploy:
//   supabase link --project-ref <your-ref>
//   supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<chat-id> TELEGRAM_NOTIFY_SECRET=<shared-secret>
//   supabase functions deploy telegram-notify
//
// Secrets:
//   TELEGRAM_BOT_TOKEN      — bot token from @BotFather
//   TELEGRAM_CHAT_ID        — your chat id (or negative group id) to receive alerts
//   TELEGRAM_NOTIFY_SECRET  — shared secret checked against the x-telegram-secret header

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TELEGRAM_API = "https://api.telegram.org";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Order = {
  id: string;
  createdAt: string;
  customer: { name: string; email: string; phone: string };
  items: {
    productId: string;
    name: string;
    price: number;
    qty: number;
    size: string;
  }[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  delivery: {
    country: string;
    countryCode?: string;
    region?: string;
    city?: string;
    postal?: string;
    address: string;
    landmark?: string;
    notes?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationLabel?: string;
  };
  payment: { method: string; status: string; reference: string };
  status: string;
};

function buildMessage(o: Order): string {
  const lines = o.items.map(
    (i) => `• ${i.name} (${i.size}) × ${i.qty} — ${i.price * i.qty}`
  );
  const loc =
    o.delivery.latitude != null && o.delivery.longitude != null
      ? `GPS: ${o.delivery.latitude}, ${o.delivery.longitude}`
      : "No precise location captured";
  return [
    "🛍 NEW PAID ORDER — SCENTURY21",
    `Order: ${o.id}`,
    `Customer: ${o.customer.name} · ${o.customer.phone} · ${o.customer.email}`,
    "",
    ...lines,
    `Total: ${o.total} ${o.currency}`,
    `Payment: ${(o.payment.status || "").toUpperCase()} (${o.payment.reference})`,
    "",
    "Delivery:",
    `• ${o.delivery.country}${o.delivery.region ? ` / ${o.delivery.region}` : ""}`,
    `• ${o.delivery.city || ""}${o.delivery.postal ? ` / ${o.delivery.postal}` : ""}`.trim(),
    `• ${o.delivery.address}`,
    o.delivery.landmark ? `• Landmark: ${o.delivery.landmark}` : "",
    `• ${loc}`,
    o.delivery.notes ? `• Note: ${o.delivery.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
  const sharedSecret = Deno.env.get("TELEGRAM_NOTIFY_SECRET") ?? "";

  // The edge function is reachable with the public anon key (JWT verification
  // only proves the caller is a client of this project), so the shared secret
  // is the real gate: only our Next.js route knows it. Fail CLOSED — if the
  // secret was never configured, refuse to serve rather than run unprotected.
  if (!sharedSecret) {
    console.error("[telegram-notify] TELEGRAM_NOTIFY_SECRET is not configured");
    return json({ ok: false, error: "telegram notify secret not configured" }, 503);
  }
  const providedSecret = req.headers.get("x-telegram-secret") ?? "";
  if (providedSecret !== sharedSecret) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  if (!token || !chatId) {
    console.error(
      "[telegram-notify] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured"
    );
    return json({ ok: false, error: "telegram not configured" }, 500);
  }

  const body = (await req.json().catch(() => ({}))) as { order?: Order };
  const order = body.order;

  if (!order) {
    return json({ ok: false, error: "missing order" }, 400);
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildMessage(order),
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    return json({ ok: res.ok, sent: res.ok, data });
  } catch {
    return json({ ok: false, sent: false, error: "telegram network error" }, 502);
  }
});
