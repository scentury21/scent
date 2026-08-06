"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOrder } from "@/lib/store";
import { formatNGN } from "@/lib/currency";
import OrderTracker from "@/components/order-tracker";
import { fetchOrderByNumber } from "@/lib/orders";
import type { Order } from "@/lib/types";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function SuccessInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const [order, setOrder] = useState<Order | null>(() => (id ? getOrder(id) ?? null : null));
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const liveOrder = await fetchOrderByNumber(id);
      if (!cancelled && liveOrder) {
        setOrder(liveOrder);
        setLive(true);
      }
    })();
    const t = window.setInterval(() => {
      (async () => {
        const liveOrder = await fetchOrderByNumber(id);
        if (!cancelled && liveOrder) {
          setOrder(liveOrder);
          setLive(true);
        }
      })();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [id]);

  if (!id) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-semibold text-zinc-50">No order found</h1>
        <Link href="/shop" className="btn btn-gold mt-8">Shop fragrances</Link>
      </div>
    );
  }

  if (!order) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center text-sm text-zinc-500">Loading your order…</div>;
  }

  const waLink = `https://wa.me/2348028383053?text=${encodeURIComponent(
    `Hello Scentury21, I'm checking on my order ${order.id}.`
  )}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-3xl">
          ✓
        </div>
        <h1 className="mt-5 font-display text-4xl font-semibold text-zinc-50">
          Order confirmed
        </h1>
        <p className="mt-2 text-zinc-400">
          Thanks, {order.customer.name.split(" ")[0]}! Your order{" "}
          <span className="font-mono text-gold-300">{order.id}</span> is{" "}
          <span className="font-semibold text-emerald-300">
            {order.payment.status === "paid" ? "paid" : "pending"} ({STATUS_LABEL[order.status]})
          </span>
          .
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Items</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-3">
                <span className="text-zinc-300">
                  {i.name} <span className="text-zinc-500">× {i.qty}</span>
                </span>
                <span className="text-zinc-200">{formatNGN(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="divider-fade my-3" />
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Total paid</span>
            <span className="font-bold gold-text">{formatNGN(order.total)}</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Delivery to</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Country</dt>
              <dd className="text-right text-zinc-200">{order.delivery.country}</dd>
            </div>
            {order.delivery.region && (
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Region</dt>
                <dd className="text-right text-zinc-200">{order.delivery.region}</dd>
              </div>
            )}
            {(order.delivery.city || order.delivery.postal) && (
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">City / Postal</dt>
                <dd className="text-right text-zinc-200">
                  {[order.delivery.city, order.delivery.postal].filter(Boolean).join(", ")}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Address</dt>
              <dd className="text-right text-zinc-200">{order.delivery.address}</dd>
            </div>
            {order.delivery.landmark && (
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Landmark</dt>
                <dd className="text-right text-zinc-200">{order.delivery.landmark}</dd>
              </div>
            )}
            {order.delivery.latitude != null && order.delivery.longitude != null && (
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Precise location</dt>
                <dd className="text-right font-mono text-xs text-cyan-300">
                  {order.delivery.latitude.toFixed(5)}, {order.delivery.longitude.toFixed(5)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="mt-4 glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Order progress</h2>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          )}
        </div>
        <div className="mt-4">
          <OrderTracker status={order.status} />
        </div>
        {!live && (
          <p className="mt-3 text-[11px] text-zinc-500">
            Sign in to see this order update live as it progresses.
          </p>
        )}
      </div>

      <div className="mt-4 glass rounded-2xl p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Next steps</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li>1 · Your payment was verified and the order is now in our queue.</li>
          <li>2 · Our team is notified instantly with your full delivery details.</li>
          <li>3 · We confirm dispatch within 24 hours — watch your WhatsApp and email.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            💬 Track on WhatsApp
          </a>
          <Link href="/shop" className="btn btn-gold">
            Continue shopping →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-24 text-center text-sm text-zinc-500">Loading…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
