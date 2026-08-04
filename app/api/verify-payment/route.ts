import { NextResponse } from "next/server";

/**
 * Server-side Paystack payment verification.
 * The order is only marked PAID after this confirms the transaction —
 * never trust the client. In demo mode (no secret configured) it simulates success.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { reference?: string; orderId?: string };
  const { reference, orderId } = body;

  if (!reference) {
    return NextResponse.json({ ok: false, error: "missing reference" }, { status: 400 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";

  if (!secret || secret.includes("your_") || secret === "sk_test_demo") {
    console.log(`[verify-payment] demo mode — simulated verification for ${reference} (order ${orderId ?? "?"})`);
    return NextResponse.json({ ok: true, demo: true, status: "success", reference });
  }

  try {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const data = (await res.json()) as { status?: boolean; message?: string };
    return NextResponse.json({ ok: data.status === true, status: data.status === true ? "success" : "failed", message: data.message, reference });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "verification network error" }, { status: 502 });
  }
}
