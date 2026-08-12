import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resend } from "@/lib/resend";
import { formatNGN } from "@/lib/currency";

/**
 * Server-side order status update (admin only).
 *
 * The admin panel used to update `orders` directly from the browser with the
 * anon key, which ONLY works if the `orders_admin_update` RLS policy exists in
 * the live project. This route updates with the SERVICE ROLE key instead, so
 * status changes always persist — even before the new RLS policies are applied.
 * It also emails the customer about their new status (same as before).
 *
 * POST { orderId: uuid, status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" }
 */

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped 🚚",
  delivered: "Delivered ✅",
  cancelled: "Cancelled",
};

export async function POST(req: Request) {
  // 1) Who is calling? Must be a signed-in admin.
  const cookieStore = await cookies();
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* read-only here */
        },
      },
    }
  );
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not signed in" }, { status: 401 });
  }

  const { data: profile } = await sessionClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // 2) Parse the payload.
  const body = (await req.json().catch(() => ({}))) as {
    orderId?: string;
    status?: string;
  };
  const orderId = body.orderId;
  const status = body.status;
  if (!orderId || !status || !STATUSES.includes(status)) {
    return NextResponse.json(
      { ok: false, error: "orderId + valid status required" },
      { status: 400 }
    );
  }

  // 3) Update with the service role key (bypasses RLS entirely).
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          /* service role — no cookies */
        },
      },
    }
  );

  const { data: order, error } = await adminClient
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select(
      "id, order_number, customer_name, customer_email, total_kobo, currency"
    )
    .single();

  if (error || !order) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "order not found" },
      { status: 500 }
    );
  }

  // 4) Email the customer about their new status (best-effort). The response
  // reports whether the email actually went out so the admin UI can say so.
  let emailSent = false;
  let emailNote: string | undefined;
  if (order.customer_email) {
    if (!resend) {
      emailNote = "No RESEND_API_KEY configured — customer email skipped. Add it in Vercel env.";
    } else {
      const trackUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/track`
        : "/track";
      const label = STATUS_LABEL[status] ?? status;
      const { error: mailError } = await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "SCENTURY21 <onboarding@resend.dev>",
        to: order.customer_email,
        subject: `Your SCENTURY21 order ${order.order_number} is now ${label}`,
        html: `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#08070f;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#0d0b18;border:1px solid #2a2342;border-radius:16px;padding:32px">
    <div style="font-size:18px;font-weight:bold;letter-spacing:5px;color:#fafafa">SCENTURY<span style="color:#d4a94a">21</span></div>
    <h1 style="color:#fafafa;margin:20px 0 4px;font-size:24px">Your order is now ${label}</h1>
    <p style="color:#a1a1aa;margin:0 0 20px">Order ${order.order_number} · ${order.customer_name}</p>
    <p style="color:#a1a1aa;margin:20px 0 0">${status === "shipped" ? "Your fragrance is on the way — keep an eye out. 📦" : status === "delivered" ? "Enjoy your scent! 🎉" : "We'll keep you posted on the next step."}</p>
    <a href="${trackUrl}" style="display:inline-block;margin-top:24px;background:linear-gradient(120deg,#eed391,#d4a94a 55%,#b98c33);color:#1c1407;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;font-size:14px">Track your order</a>
    <p style="color:#71717a;font-size:12px;margin:28px 0 0">Scentury21 · The House of Fine Fragrance</p>
  </div>
</body>
</html>`,
      });
      if (mailError) {
        emailNote = `Status updated, but the customer email failed (${mailError.message}). Check EMAIL_FROM and Resend domain verification.`;
        console.error("[admin/orders/status] email error", mailError);
      } else {
        emailSent = true;
      }
    }
  }

  return NextResponse.json({ ok: true, order, emailSent, emailNote });
}
