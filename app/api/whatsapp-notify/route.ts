import { NextResponse } from "next/server";
import type { Order } from "@/lib/types";

function buildMessage(o: Order): string {
  const lines = o.items.map((i) => `• ${i.name} (${i.size}) × ${i.qty} — ${i.price * i.qty}`);
  const loc =
    o.delivery.latitude != null && o.delivery.longitude != null
      ? `GPS: ${o.delivery.latitude.toFixed(5)}, ${o.delivery.longitude.toFixed(5)}`
      : "No precise location captured";
  return [
    "🧾 NEW PAID ORDER — SCENTURY21",
    `Order: ${o.id}`,
    `Customer: ${o.customer.name} · ${o.customer.phone}`,
    "",
    ...lines,
    `Total: ${o.total} ${o.currency}`,
    `Payment: ${o.payment.status.toUpperCase()} (${o.payment.reference})`,
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

/**
 * Sends a WhatsApp notification for a paid order to the Scentury21 business
 * number via the official WhatsApp Business Cloud API (Meta).
 * Credentials stay server-side — never in frontend code.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { order?: Order };
  const order = body.order;

  if (!order) {
    return NextResponse.json({ ok: false, error: "missing order" }, { status: 400 });
  }

  const token = process.env.WHATSAPP_TOKEN ?? "";
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER ?? "";

  if (!token || !phoneId || token.includes("your_") || !businessNumber) {
    console.log("[whatsapp-notify] demo mode — order would be sent to", businessNumber || "unset", "->", order.id);
    return NextResponse.json({ ok: true, demo: true, sent: false, orderId: order.id });
  }

  try {
    const message = buildMessage(order);
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: businessNumber,
        type: "text",
        text: { body: message },
      }),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json({ ok: res.ok, sent: res.ok, data });
  } catch {
    return NextResponse.json({ ok: false, sent: false, error: "whatsapp network error" }, { status: 502 });
  }
}
