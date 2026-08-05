"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatNGN } from "@/lib/currency";
import ProductBottle from "@/components/product-bottle";
import { useMemo } from "react";

const FREE_SHIPPING_THRESHOLD = 250000;
const SHIPPING_FEE = 5000;

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal, hydrated, getProduct } = useCart();

  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal;

  const whatsappText = useMemo(() => {
    const lines = items
      .map((i) => {
        const p = getProduct(i.productId);
        return p ? `• ${p.name} (${p.size}) × ${i.qty} — ${formatNGN(p.price * i.qty)}` : "";
      })
      .filter(Boolean);
    return `Hello Scentury21! I'd like to order:%0A${lines.join("%0A")}%0ATotal: ${formatNGN(total)}`;
  }, [items, total, getProduct]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
        <div className="text-sm text-zinc-500">Loading your cart…</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <div className="text-6xl">🛒</div>
        <h1 className="mt-6 font-display text-4xl font-semibold text-zinc-50">Your cart is empty</h1>
        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          Your signature scent is waiting. Explore the collection and find the one.
        </p>
        <Link href="/shop" className="btn btn-gold mt-8">
          Browse fragrances →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Your cart</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {items.length} item{items.length > 1 ? "s" : ""} · prices in Nigerian naira
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const p = getProduct(item.productId);
            if (!p) return null;
            return (
              <div
                key={item.productId}
                className="glass flex gap-4 rounded-2xl p-4 transition-colors hover:border-white/15"
              >
                <Link href={`/product/${p.id}`} className="shrink-0">
                  <div
                    className="flex h-28 w-24 items-center justify-center rounded-xl"
                    style={{
                      background: `radial-gradient(120% 120% at 50% 0%, ${p.palette[0]}30, transparent 70%)`,
                    }}
                  >
                    <ProductBottle product={p} className="h-24 w-auto" />
                  </div>
                </Link>

                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-400/80">
                        {p.category} · {p.size}
                      </div>
                      <Link
                        href={`/product/${p.id}`}
                        className="font-display text-xl font-semibold text-zinc-100 transition-colors hover:text-gold-200"
                      >
                        {p.name}
                      </Link>
                    </div>
                    <button
                      onClick={() => removeItem(p.id)}
                      aria-label={`Remove ${p.name}`}
                      className="text-zinc-500 transition-colors hover:text-red-400"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04]">
                      <button
                        onClick={() => updateQty(p.id, item.qty - 1)}
                        className="h-9 w-9 text-zinc-300 transition-colors hover:text-gold-200"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-zinc-100">{item.qty}</span>
                      <button
                        onClick={() => updateQty(p.id, item.qty + 1)}
                        className="h-9 w-9 text-zinc-300 transition-colors hover:text-gold-200"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold text-gold-200">
                        {formatNGN(p.price * item.qty)}
                      </div>
                      <div className="text-[11px] text-zinc-500">{formatNGN(p.price)} each</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Link href="/shop" className="inline-flex items-center gap-1 text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200">
            ← Continue shopping
          </Link>
        </div>

        {/* Summary */}
        <div className="h-fit lg:sticky lg:top-24">
          <div className="glass rounded-2xl p-6">
            <h2 className="font-display text-2xl font-semibold text-zinc-100">Order summary</h2>

            {remaining > 0 && (
              <div className="mt-4 rounded-xl border border-gold-400/20 bg-gold-400/[0.07] p-3 text-xs text-gold-200">
                Add {formatNGN(remaining)} more for <strong>free shipping</strong> ✨
              </div>
            )}

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-zinc-400">
                <dt>Subtotal</dt>
                <dd className="text-zinc-200">{formatNGN(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-zinc-400">
                <dt>Shipping</dt>
                <dd className="text-zinc-200">{shipping === 0 ? "Free" : formatNGN(shipping)}</dd>
              </div>
              <div className="divider-fade" />
              <div className="flex justify-between text-base font-bold">
                <dt className="text-zinc-100">Total</dt>
                <dd className="gold-text">{formatNGN(total)}</dd>
              </div>
            </dl>

            <Link href="/checkout" className="btn btn-gold mt-6 w-full py-3.5 text-base">
              Proceed to checkout →
            </Link>
            <a
              href={`https://wa.me/2348028383053?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost mt-3 w-full py-3"
            >
              💬 Or order on WhatsApp
            </a>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
              <span>🔒 Secure checkout</span>
              <span>·</span>
              <span>💳 Paystack</span>
              <span>·</span>
              <span>🌍 Worldwide delivery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
