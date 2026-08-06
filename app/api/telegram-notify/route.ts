import { NextResponse } from "next/server";
import type { Order } from "@/lib/types";

/**
 * Proxies a paid order to the Supabase Edge Function `telegram-notify`,
 * which sends the alert via the Telegram Bot API. The shared secret and
 * function URL stay server-side — never in frontend code.
 *
 * Demo mode (no TELEGRAM_NOTIFY_SECRET configured) logs instead of sending,
 * matching the WhatsApp notification pattern.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { order?: Order };
  const order = body.order;

  if (!order) {
    return NextResponse.json({ ok: false, error: "missing order" }, { status: 400 });
  }

  const secret = process.env.TELEGRAM_NOTIFY_SECRET ?? "";
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!secret || secret.includes("your_") || !supabaseUrl || !anonKey) {
    console.log("[telegram-notify] demo mode — order would be sent to Telegram:", order.id);
    return NextResponse.json({ ok: true, demo: true, sent: false, orderId: order.id });
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/telegram-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "x-telegram-secret": secret,
      },
      body: JSON.stringify({ order }),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json({ ok: res.ok, sent: res.ok, data });
  } catch {
    return NextResponse.json(
      { ok: false, sent: false, error: "edge function network error" },
      { status: 502 }
    );
  }
}
