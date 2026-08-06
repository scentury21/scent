"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OrderTracker from "@/components/order-tracker";
import { fetchMyOrders, lookupGuestOrder } from "@/lib/orders";
import { formatNGN, formatDate } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/lib/types";

export default function TrackPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Guest lookup state
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<Order | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setLoggedIn(!!user);
      if (!user) {
        setLoading(false);
        return;
      }
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
    })();
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLooking(true);
    setLookupError(null);
    setFound(null);
    const result = await lookupGuestOrder(orderNo.trim(), email.trim());
    setLooking(false);
    if (result) {
      setFound(result);
    } else {
      setLookupError("No order found — double-check your order number and email.");
    }
  }

  const guestForm = (
    <div className="glass mx-auto mt-8 max-w-lg rounded-2xl p-6">
      <h2 className="font-display text-2xl font-semibold text-zinc-100">Find your order</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Enter the order number from your confirmation and the email you ordered with.
      </p>
      <form onSubmit={handleLookup} className="mt-5 space-y-4">
        <div>
          <label className="input-label" htmlFor="t-no">Order number</label>
          <input
            id="t-no"
            className="input font-mono"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="SC-XXXX"
            required
          />
        </div>
        <div>
          <label className="input-label" htmlFor="t-email">Email used at checkout</label>
          <input
            id="t-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
          />
        </div>
        {lookupError && <p className="text-sm text-rose-300">{lookupError}</p>}
        <button type="submit" disabled={looking} className="btn btn-gold w-full py-3">
          {looking ? "Looking up…" : "Track my order"}
        </button>
      </form>

      {found && (
        <div className="mt-6">
          <OrderTracker status={found.status} />
          <div className="divider-fade my-4" />
          <ul className="space-y-1.5 text-sm text-zinc-400">
            {found.items.map((i) => (
              <li key={i.productId} className="flex justify-between">
                <span>
                  {i.name} × {i.qty}
                </span>
                <span className="text-zinc-300">{formatNGN(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-zinc-500">{formatDate(found.createdAt)}</span>
            <span className="font-bold gold-text">{formatNGN(found.total)}</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Track your order</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {loggedIn
          ? "Live status from your account — updates automatically."
          : "Enter your order details below to see live status."}
      </p>

      {loggedIn === null || (loggedIn && loading) ? (
        <div className="glass mt-8 h-48 animate-pulse rounded-2xl" />
      ) : !loggedIn ? (
        guestForm
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
