import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { formatNGN } from "@/lib/currency";

/**
 * Sends customer emails via Resend:
 *   POST { order }          → order confirmation
 *   POST { order, status }  → status update ("your order is now shipped")
 *
 * Requires RESEND_API_KEY (server-side). Without it, logs and returns (demo
 * mode), matching the other notifiers.
 */

type EmailOrder = {
  id?: string;
  order_number?: string;
  customer_name?: string;
  customer_email: string;
  customer_phone?: string;
  total?: number;
  total_kobo?: number;
  currency?: string;
  createdAt?: string;
  items?: { name: string; size?: string; qty: number; price?: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped 🚚",
  delivered: "Delivered ✅",
  cancelled: "Cancelled",
};

const EMOJI: Record<string, string> = {
  pending: "⏳",
  processing: "👩‍🎨",
  shipped: "🚚",
  delivered: "✅",
  cancelled: "✕",
};

function orderNumber(o: EmailOrder): string {
  return o.order_number || o.id || "—";
}

function buildHtml(o: EmailOrder, status?: string): string {
  const isStatus = !!status;
  const label = status ? STATUS_LABEL[status] ?? status : "";
  const lines = (o.items ?? [])
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#d4d4d8">${i.name}${i.size ? ` · ${i.size}` : ""} × ${i.qty}</td>` +
        `<td style="padding:6px 0;text-align:right;color:#f4f4f5">${formatNGN((i.price ?? 0) * i.qty)}</td></tr>`
    )
    .join("");
  const trackUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/track`
    : "/track";

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#08070f;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#0d0b18;border:1px solid #2a2342;border-radius:16px;padding:32px">
    <div style="font-size:18px;font-weight:bold;letter-spacing:5px;color:#fafafa">SCENTURY<span style="color:#d4a94a">21</span></div>
    <h1 style="color:#fafafa;margin:20px 0 4px;font-size:24px">${isStatus ? `${EMOJI[status ?? ""] ?? ""} Your order is now ${label}` : "Order confirmed 🎉"}</h1>
    <p style="color:#a1a1aa;margin:0 0 20px">Order ${orderNumber(o)}${o.customer_name ? ` · ${o.customer_name}` : ""}</p>
    <table style="width:100%;border-collapse:collapse">
      ${lines}
      <tr>
        <td style="padding:12px 0 0;border-top:1px solid #2a2342;color:#a1a1aa">Total</td>
        <td style="padding:12px 0 0;border-top:1px solid #2a2342;text-align:right;color:#eed391;font-size:18px;font-weight:bold">${formatNGN(o.total ?? (o.total_kobo ?? 0) / 100)}</td>
      </tr>
    </table>
    ${
      isStatus && status === "shipped"
        ? '<p style="color:#a1a1aa;margin:20px 0 0">Your fragrance is on the way — keep an eye out. 📦</p>'
        : !isStatus
          ? '<p style="color:#a1a1aa;margin:20px 0 0">Thanks for your order! Our team confirms dispatch within 24 hours and you will get an email as it ships.</p>'
          : ""
    }
    <a href="${trackUrl}" style="display:inline-block;margin-top:24px;background:linear-gradient(120deg,#eed391,#d4a94a 55%,#b98c33);color:#1c1407;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;font-size:14px">Track your order</a>
    <p style="color:#71717a;font-size:12px;margin:28px 0 0">Scentury21 · The House of Fine Fragrance</p>
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    order?: EmailOrder;
    status?: string;
  };
  const order = body.order;
  const status = body.status;

  if (!order?.customer_email) {
    return NextResponse.json({ ok: false, error: "missing order / customer email" }, { status: 400 });
  }

  if (!resend) {
    console.log(
      `[email-notify] demo mode — ${status ? `status (${status})` : "confirmation"} email for ${order.customer_email}`
    );
    return NextResponse.json({ ok: true, demo: true, sent: false });
  }

  try {
    const subject = status
      ? `Your SCENTURY21 order ${orderNumber(order)} is now ${STATUS_LABEL[status] ?? status}`
      : `Order confirmed — ${orderNumber(order)} (SCENTURY21)`;

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "SCENTURY21 <onboarding@resend.dev>",
      to: order.customer_email,
      subject,
      html: buildHtml(order, status),
    });

    if (error) {
      console.error("[email-notify] send error", error);
      return NextResponse.json({ ok: false, sent: false, error: error.message }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[email-notify] error", err);
    return NextResponse.json({ ok: false, sent: false, error: "email send error" }, { status: 502 });
  }
}
