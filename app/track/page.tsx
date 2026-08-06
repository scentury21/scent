"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OrderTracker from "@/components/order-tracker";
import { fetchMyOrders } from "@/lib/orders";
import { formatNGN, formatDate } from "@/lib/currency";
import type { Order } from "@/lib/types";

export default function TrackPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const live = await fetchMyOrders();
      if (!cancelled) {
        setOrders(live);
        setLoading(false);
      }
    })();
    const t = window.setInterval(() => {
      (async () => {
        const live = await fetchMyOrders();
        if (!cancelled) setOrders(live);
      })();
    }, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Track your orders</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Live status from your account — updates automatically.
      </p>

      {loading ? (
        <div className="glass mt-8 h-48 animate-pulse rounded-2xl" />
      ) : orders.length === 0 ? (
        <div className="glass mt-8 rounded-2xl p-12 text-center">
          <div className="text-4xl">📦</div>
          <p className="mt-3 text-zinc-400">No orders yet — your first scent awaits.</p>
          <Link href="/shop" className="btn btn-gold mt-6">
            Shop now
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-sm text-gold-300">{o.id}</span>
                  <span className="ml-3 text-xs text-zinc-500">{formatDate(o.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold gold-text">{formatNGN(o.total)}</span>
                  <Link
                    href={`/checkout/success?id=${o.id}`}
                    className="font-semibold text-gold-300 transition-colors hover:text-gold-200"
                  >
                    Details →
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <OrderTracker status={o.status} />
              </div>

              <div className="divider-fade my-4" />
              <ul className="space-y-1.5 text-sm text-zinc-400">
                {o.items.map((i) => (
                  <li key={i.productId} className="flex justify-between">
                    <span>
                      {i.name} × {i.qty}
                    </span>
                    <span className="text-zinc-300">{formatNGN(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
