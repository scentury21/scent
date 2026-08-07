// Supabase Edge Function: telegram-daily-report
//
// Scheduled function — pushes a morning store report to the owner's Telegram
// chat. Runs via pg_cron on the schedule in supabase/config.toml.
//
// Deploy:
//   supabase functions deploy telegram-daily-report
// (The schedule is defined in config.toml under [functions.telegram-daily-report].)
//
// Secrets used: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (same bot as the alerts),
// plus the built-in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TELEGRAM_API = "https://api.telegram.org";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sb(path: string) {
  const res = await fetch(`${SB_URL}${path}`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

async function tg(method: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
  return fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => r.json());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  // Only our cron (or the owner calling manually) should trigger this.
  const auth = req.headers.get("authorization") ?? "";
  const secret = Deno.env.get("TELEGRAM_AGENT_SECRET") ?? "";
  if (secret && auth !== `Bearer ${secret}`) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const chatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
  if (!chatId) {
    return json({ ok: false, error: "TELEGRAM_CHAT_ID not configured" }, 500);
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    ).toISOString();

    const [orders, yesterdayOrders, products] = await Promise.all([
      sb("/rest/v1/orders?select=order_number,status,payment_status,total_kobo,created_at&order=created_at.desc&limit=1000"),
      sb(`/rest/v1/orders?select=total_kobo&payment_status=eq.paid&created_at=gte.${yesterday}&created_at=lt.${today}&limit=1000`),
      sb("/rest/v1/products?select=name,stock,active"),
    ]);

    const all = orders as Record<string, unknown>[];
    const paidToday = (all as Record<string, unknown>[]).filter(
      (o) => o.payment_status === "paid" && String(o.created_at) >= today
    );
    const revenueToday =
      paidToday.reduce((s, o) => s + Number(o.total_kobo ?? 0), 0) / 100;
    const revenueYesterday =
      (yesterdayOrders as Record<string, unknown>[]).reduce(
        (s, o) => s + Number(o.total_kobo ?? 0),
        0
      ) / 100;
    const byStatus = new Map<string, number>();
    for (const o of all) {
      byStatus.set(String(o.status), (byStatus.get(String(o.status)) ?? 0) + 1);
    }
    const live = (products as Record<string, unknown>[]).filter(
      (p) => p.active !== false
    );
    const low = live.filter((p) => Number(p.stock) <= 5);

    const lines = [
      `🌅 Good morning boss — ${now.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
      })}`,
      ``,
      `📦 Orders today: ${all.filter((o) => String(o.created_at) >= today).length} (${paidToday.length} paid)`,
      `💰 Revenue today: ₦${revenueToday.toLocaleString()}`,
      `📈 Yesterday: ₦${revenueYesterday.toLocaleString()}`,
      `Status: ${[...byStatus.entries()].map(([s, n]) => `${s} ${n}`).join(", ")}`,
      `🫙 Products: ${live.length} live · ${low.length} low-stock`,
      low.length
        ? `⚠️ Restock soon: ${low
            .slice(0, 6)
            .map((p) => `${p.name} (${p.stock})`)
            .join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await tg("sendMessage", { chat_id: chatId, text: lines });
    return json({ ok: sent?.ok ?? false, sent });
  } catch (err) {
    return json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      502
    );
  }
});
