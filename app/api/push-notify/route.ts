import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { Order } from "@/lib/types";

/**
 * Sends a browser push notification to every admin subscription when a new
 * order is placed. Fired from checkout (fire-and-forget), same as the
 * WhatsApp / Telegram notifiers.
 *
 * Requires (server-side only, never in client code):
 *   SUPABASE_SERVICE_ROLE_KEY      — reads admin subscriptions (bypasses RLS)
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY   — VAPID public key
 *   VAPID_PRIVATE_KEY              — VAPID private key
 *   VAPID_SUBJECT                  — optional, mailto: or https contact
 *
 * Without them it logs and returns (demo mode).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { order?: Order };
  const order = body.order;

  if (!order) {
    return NextResponse.json({ ok: false, error: "missing order" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? "";
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:hello@scentury21.com";

  if (!serviceKey || serviceKey.includes("your_") || !supabaseUrl || !vapidPublic || !vapidPrivate) {
    console.log("[push-notify] demo mode — order would push to admins:", order.id);
    return NextResponse.json({ ok: true, demo: true, sent: 0, orderId: order.id });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Only subscriptions owned by admin accounts.
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, profiles!inner(role)")
      .eq("profiles.role", "admin");

    if (!subs || subs.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, orderId: order.id });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const payload = JSON.stringify({
      title: "🛍 New order placed",
      body: `${order.id} · ${order.customer.name} · ${order.total} ${order.currency}`,
      url: "/admin/orders",
    });

    let sent = 0;
    const staleEndpoints: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent += 1;
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            // Subscription expired / device gone — clean it up.
            staleEndpoints.push(sub.endpoint);
          } else {
            console.error("[push-notify] send failed", status ?? err);
          }
        }
      })
    );

    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);
    }

    return NextResponse.json({ ok: true, sent, orderId: order.id });
  } catch (err) {
    console.error("[push-notify] error", err);
    return NextResponse.json({ ok: false, error: "push send error" }, { status: 502 });
  }
}
