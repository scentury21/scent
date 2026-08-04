"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getOrders, getCustomers, getProducts } from "@/lib/store";
import { formatNGN } from "@/lib/currency";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminDashboard() {
  const orders = getOrders();
  const customers = getCustomers();
  const products = getProducts();

  const stats = useMemo(() => {
    const revenue = orders.filter((o) => o.payment.status === "paid").reduce((a, o) => a + o.total, 0);
    const lowStock = products.filter((p) => p.stock <= 8);
    return { revenue, orderCount: orders.length, customerCount: customers.length, lowStock };
  }, [orders, customers, products]);

  const chart = useMemo(() => {
    const buckets = new Array(7).fill(0) as number[];
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const idx = (d.getDay() + 6) % 7; // Monday-first
      buckets[idx] += o.total;
    }
    const max = Math.max(...buckets, 1);
    return buckets.map((v, i) => ({ day: DAYS[i], value: v, pct: Math.round((v / max) * 100) }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of orders) {
      for (const i of o.items) {
        const e = map.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0 };
        e.qty += i.qty;
        e.revenue += i.price * i.qty;
        map.set(i.productId, e);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  const recent = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-zinc-50">Dashboard</h1>
          <p className="text-sm text-zinc-500">Store overview — live from demo data (localStorage)</p>
        </div>
        <Link href="/admin/products" className="btn btn-gold px-5 py-2.5 text-xs">+ Add product</Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Total revenue", formatNGN(stats.revenue), "💰", "from-gold-400/15"],
          ["Orders", String(stats.orderCount), "📦", "from-cyan-400/15"],
          ["Customers", String(stats.customerCount), "👥", "from-fuchsia-400/15"],
          ["Low stock", String(stats.lowStock.length), "⚠️", "from-amber-400/15"],
        ].map(([label, value, icon, grad]) => (
          <div key={label} className={`glass rounded-2xl bg-gradient-to-br ${grad} to-transparent p-5`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</span>
              <span className="text-lg">{icon}</span>
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-zinc-50">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-zinc-100">Sales this week</h2>
          <div className="mt-6 flex h-40 items-end justify-between gap-2">
            {chart.map((b) => (
              <div key={b.day} className="group flex flex-1 flex-col items-center gap-2">
                <div className="text-[10px] text-zinc-500 group-hover:text-gold-200">
                  {b.value > 0 ? formatNGN(b.value) : ""}
                </div>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-gold-600/60 to-gold-300/80 transition-all duration-500 group-hover:from-gold-500 group-hover:to-gold-200"
                  style={{ height: `${Math.max(b.pct, 4)}%` }}
                />
                <div className="text-[10px] uppercase text-zinc-500">{b.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold text-zinc-100">Top products</h2>
          {topProducts.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">No sales yet — place a demo order from the storefront.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topProducts.map((t, idx) => (
                <li key={t.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-xs font-bold text-gold-300">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-zinc-200">{t.name}</div>
                    <div className="text-[11px] text-zinc-500">{t.qty} sold</div>
                  </div>
                  <span className="text-sm font-semibold text-gold-200">{formatNGN(t.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-zinc-100">Recent orders</h2>
          <Link href="/admin/orders" className="text-xs font-semibold text-gold-300 hover:text-gold-200">Manage all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No orders yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="pb-2 pr-4">Order</th>
                  <th className="pb-2 pr-4">Customer</th>
                  <th className="pb-2 pr-4">Country</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs text-gold-300">{o.id}</td>
                    <td className="py-3 pr-4 text-zinc-300">{o.customer.name}</td>
                    <td className="py-3 pr-4 text-zinc-400">{o.delivery.country}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-zinc-100">{formatNGN(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
