"use client";

import type { Order } from "@/lib/types";

export const ORDER_STEPS = ["pending", "processing", "shipped", "delivered"] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];

export const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  processing: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  shipped: "bg-blue-400/10 text-blue-300 border-blue-400/30",
  delivered: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  cancelled: "bg-red-400/10 text-red-300 border-red-400/30",
};

/**
 * Visual timeline of an order's journey:
 *   Pending → Processing → Shipped → Delivered
 * Cancelled orders render a red notice instead.
 */
export default function OrderTracker({ status }: { status: Order["status"] }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
        ✕ This order was cancelled.
      </div>
    );
  }

  const currentIndex = ORDER_STEPS.indexOf(status as OrderStep);

  return (
    <div className="flex items-center">
      {ORDER_STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                  done
                    ? "border-transparent bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950"
                    : active
                      ? "border-gold-400 bg-gold-400/15 text-gold-300 shadow-[0_0_14px_-2px_rgba(212,169,74,0.55)]"
                      : "border-white/15 bg-white/[0.03] text-zinc-600"
                }`}
              >
                {done ? "✓" : active ? "●" : ""}
              </span>
              <span
                className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider ${
                  done || active ? "text-zinc-200" : "text-zinc-600"
                }`}
              >
                {STATUS_LABEL[step]}
              </span>
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <div
                className={`mx-2 mb-5 h-0.5 flex-1 rounded ${
                  i < currentIndex
                    ? "bg-gradient-to-r from-gold-400 to-gold-600"
                    : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
