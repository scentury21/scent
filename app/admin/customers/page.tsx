"use client";

import { useState } from "react";
import { getCustomers } from "@/lib/store";
import { formatNGN, formatDate } from "@/lib/currency";

export default function AdminCustomersPage() {
  const [customers] = useState(() => getCustomers());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-zinc-50">Customers</h1>
        <p className="text-sm text-zinc-500">
          {customers.length} customer{customers.length === 1 ? "" : "s"} · derived from orders (privacy-protected by RLS in production)
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <div className="text-4xl">👥</div>
          <p className="mt-3 text-zinc-400">No customers yet — orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total spent</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Contact</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ink-600 to-ink-800 text-sm font-bold text-gold-200">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="font-medium text-zinc-100">{c.name}</div>
                        <div className="text-[11px] text-zinc-500">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{c.phone}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.country}</td>
                  <td className="px-4 py-3 text-zinc-200">{c.orders}</td>
                  <td className="px-4 py-3 font-semibold text-gold-200">{formatNGN(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(c.joined)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hello! This is Scentury21. 👋")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20"
                    >
                      💬
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
