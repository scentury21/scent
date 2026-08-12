"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNGN, formatDate } from "@/lib/currency";
import { showToast } from "@/components/toast";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  processing: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  shipped: "bg-blue-400/10 text-blue-300 border-blue-400/30",
  delivered: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  cancelled: "bg-red-400/10 text-red-300 border-red-400/30",
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  payment_reference: string | null;
  subtotal_kobo: number;
  shipping_kobo: number;
  total_kobo: number;
  delivery_country: string;
  delivery_region: string;
  delivery_city: string;
  delivery_postal: string;
  delivery_address: string;
  delivery_landmark: string;
  delivery_notes: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  created_at: string;
};

type ItemRow = { order_id: string; name: string; size: string; price_kobo: number; qty: number };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [o, i] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("order_items").select("order_id, name, size, price_kobo, qty"),
      ]);
      if (o.error || i.error) setError((o.error ?? i.error)?.message ?? "Failed to load");
      setOrders((o.data ?? []) as OrderRow[]);
      setItems((i.data ?? []) as ItemRow[]);
      setLoading(false);
    })();
  }, []);

  async function handleStatus(id: string, status: string) {
    /* Updates run through a server-side route with the service role key, so
       they persist regardless of RLS policy state, and the customer is
       emailed about the new status. */
    const res = await fetch("/api/admin/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, status }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      emailSent?: boolean;
      emailNote?: string;
    };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not update status — try again.");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    if (data.emailSent) {
      showToast("Status updated — customer emailed ✉️", "success");
    } else if (data.emailNote) {
      showToast(`Status updated — email skipped: ${data.emailNote}`, "info");
    } else {
      showToast("Status updated", "success");
    }
  }

  const itemsFor = (id: string) => items.filter((i) => i.order_id === id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-zinc-50">Orders</h1>
        <p className="text-sm text-zinc-500">{orders.length} order{orders.length === 1 ? "" : "s"} · live from Supabase</p>
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading && <div className="glass h-48 animate-pulse rounded-2xl" />}

      {!loading && orders.length === 0 && (
        <div className="glass rounded-2xl p-14 text-center">
          <div className="text-4xl">📦</div>
          <p className="mt-3 text-zinc-400">No orders yet. Checkouts are saved to Supabase automatically.</p>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((o) => {
          const open = expanded === o.id;
          const lineItems = itemsFor(o.id);
          return (
            <div key={o.id} className="glass rounded-2xl">
              <button
                onClick={() => setExpanded(open ? null : o.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pending}`}>
                    {o.status === "shipped" ? "🚚" : o.status === "delivered" ? "✅" : o.status === "cancelled" ? "✕" : "⏳"}
                  </span>
                  <div>
                    <div className="font-mono text-sm text-gold-300">{o.order_number}</div>
                    <div className="text-xs text-zinc-500">
                      {o.customer_name} · {formatDate(o.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${o.payment_status === "paid" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
                    {o.payment_status === "paid" ? "Paid" : "Pending"}
                  </span>
                  <span className="font-display text-lg font-bold text-zinc-100">{formatNGN((o.total_kobo ?? 0) / 100)}</span>
                  <span className="text-zinc-500">{open ? "▲" : "▼"}</span>
                </div>
              </button>

              {open && (
                <div className="border-t border-white/[0.06] p-5">
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Items</h3>
                      <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                        {lineItems.map((i, idx) => (
                          <li key={idx} className="flex justify-between gap-3">
                            <span>{i.name}{i.size ? ` · ${i.size}` : ""} × {i.qty}</span>
                            <span>{formatNGN((i.price_kobo / 100) * i.qty)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="divider-fade my-3" />
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Total</span>
                        <span className="font-bold gold-text">{formatNGN((o.total_kobo ?? 0) / 100)}</span>
                      </div>
                      {o.payment_reference && <div className="mt-1 text-[11px] text-zinc-500">Ref: {o.payment_reference}</div>}
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Delivery</h3>
                      <dl className="mt-3 space-y-1.5 text-sm text-zinc-300">
                        <div className="flex justify-between gap-3"><dt className="text-zinc-500">Country</dt><dd>{o.delivery_country}{o.delivery_region ? ` · ${o.delivery_region}` : ""}</dd></div>
                        {(o.delivery_city || o.delivery_postal) && (
                          <div className="flex justify-between gap-3"><dt className="text-zinc-500">City / Postal</dt><dd>{[o.delivery_city, o.delivery_postal].filter(Boolean).join(", ")}</dd></div>
                        )}
                        <div className="flex justify-between gap-3"><dt className="text-zinc-500">Address</dt><dd className="text-right">{o.delivery_address}</dd></div>
                        {o.delivery_landmark && <div className="flex justify-between gap-3"><dt className="text-zinc-500">Landmark</dt><dd>{o.delivery_landmark}</dd></div>}
                        {o.delivery_latitude != null && o.delivery_longitude != null && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-zinc-500">GPS</dt>
                            <dd className="font-mono text-xs text-cyan-300">
                              {o.delivery_latitude.toFixed(5)}, {o.delivery_longitude.toFixed(5)}
                            </dd>
                          </div>
                        )}
                        {o.delivery_notes && <div className="text-xs text-zinc-400">📝 {o.delivery_notes}</div>}
                      </dl>
                      <a
                        href={`https://www.google.com/maps?q=${o.delivery_latitude ?? 0},${o.delivery_longitude ?? 0}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                      >
                        📍 Open in maps app
                      </a>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Customer & status</h3>
                      <div className="mt-3 space-y-1.5 text-sm text-zinc-300">
                        <div>{o.customer_name}</div>
                        <div>{o.customer_phone}</div>
                        <div>{o.customer_email}</div>
                      </div>
                      <a
                        href={`https://wa.me/${o.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${o.customer_name.split(" ")[0]}, this is Scentury21 about your order ${o.order_number}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20"
                      >
                        💬 WhatsApp customer
                      </a>
                      <div className="mt-4">
                        <label className="input-label">Order status</label>
                        <select
                          value={o.status}
                          onChange={(e) => handleStatus(o.id, e.target.value)}
                          className="input cursor-pointer"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
