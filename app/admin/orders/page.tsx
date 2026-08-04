"use client";

import { useState } from "react";
import { getOrders, updateOrderStatus } from "@/lib/store";
import { formatNGN, formatDate } from "@/lib/currency";
import type { Order } from "@/lib/types";

const STATUSES: Order["status"][] = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_STYLES: Record<Order["status"], string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  processing: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  shipped: "bg-blue-400/10 text-blue-300 border-blue-400/30",
  delivered: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  cancelled: "bg-red-400/10 text-red-300 border-red-400/30",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleStatus = (id: string, status: Order["status"]) => {
    updateOrderStatus(id, status);
    setOrders(getOrders());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-zinc-50">Orders</h1>
        <p className="text-sm text-zinc-500">{orders.length} order{orders.length === 1 ? "" : "s"} · payment verified server-side before dispatch</p>
      </div>

      {orders.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <div className="text-4xl">📦</div>
          <p className="mt-3 text-zinc-400">No orders yet. Place one from the storefront to see it here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const open = expanded === o.id;
            return (
              <div key={o.id} className="glass rounded-2xl">
                <button
                  onClick={() => setExpanded(open ? null : o.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${STATUS_STYLES[o.status]}`}>
                      {o.status === "shipped" ? "🚚" : o.status === "delivered" ? "✅" : o.status === "cancelled" ? "✕" : "⏳"}
                    </span>
                    <div>
                      <div className="font-mono text-sm text-gold-300">{o.id}</div>
                      <div className="text-xs text-zinc-500">
                        {o.customer.name} · {formatDate(o.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${o.payment.status === "paid" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300"}`}>
                      {o.payment.status === "paid" ? "Paid" : "Pending"}
                    </span>
                    <span className="font-display text-lg font-bold text-zinc-100">{formatNGN(o.total)}</span>
                    <span className="text-zinc-500">{open ? "▲" : "▼"}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-white/[0.06] p-5">
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Items</h3>
                        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                          {o.items.map((i) => (
                            <li key={i.productId} className="flex justify-between gap-3">
                              <span>{i.name} × {i.qty}</span>
                              <span>{formatNGN(i.price * i.qty)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="divider-fade my-3" />
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Total</span>
                          <span className="font-bold gold-text">{formatNGN(o.total)}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-zinc-500">Ref: {o.payment.reference}</div>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Delivery</h3>
                        <dl className="mt-3 space-y-1.5 text-sm text-zinc-300">
                          <div className="flex justify-between gap-3"><dt className="text-zinc-500">Country</dt><dd>{o.delivery.country}{o.delivery.region ? ` · ${o.delivery.region}` : ""}</dd></div>
                          {(o.delivery.city || o.delivery.postal) && (
                            <div className="flex justify-between gap-3"><dt className="text-zinc-500">City / Postal</dt><dd>{[o.delivery.city, o.delivery.postal].filter(Boolean).join(", ")}</dd></div>
                          )}
                          <div className="flex justify-between gap-3"><dt className="text-zinc-500">Address</dt><dd className="text-right">{o.delivery.address}</dd></div>
                          {o.delivery.landmark && <div className="flex justify-between gap-3"><dt className="text-zinc-500">Landmark</dt><dd>{o.delivery.landmark}</dd></div>}
                          {o.delivery.latitude != null && o.delivery.longitude != null && (
                            <div className="flex justify-between gap-3">
                              <dt className="text-zinc-500">GPS</dt>
                              <dd className="font-mono text-xs text-cyan-300">
                                {o.delivery.latitude.toFixed(5)}, {o.delivery.longitude.toFixed(5)}
                              </dd>
                            </div>
                          )}
                          {o.delivery.notes && <div className="text-xs text-zinc-400">📝 {o.delivery.notes}</div>}
                        </dl>
                        <a
                          href={`https://www.google.com/maps?q=${o.delivery.latitude ?? 0},${o.delivery.longitude ?? 0}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                        >
                          📍 Open in maps app (admin reference)
                        </a>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-gold-300">Customer & status</h3>
                        <div className="mt-3 space-y-1.5 text-sm text-zinc-300">
                          <div>{o.customer.name}</div>
                          <div>{o.customer.phone}</div>
                          <div>{o.customer.email}</div>
                        </div>
                        <a
                          href={`https://wa.me/${o.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hello ${o.customer.name.split(" ")[0]}, this is Scentury21 about your order ${o.id}.`)}`}
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
                            onChange={(e) => handleStatus(o.id, e.target.value as Order["status"])}
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
      )}
    </div>
  );
}
