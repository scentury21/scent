"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { isWishlisted, toggleWishlist } from "@/lib/store";
import { useEffect, useState as useWish } from "react";

export default function AddToCartPanel({
  productId,
  disabled = false,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useWish(false);

  useEffect(() => {
    setWished(isWishlisted(productId));
  }, [productId]);

  const handleAdd = () => {
    addItem(productId, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    addItem(productId, qty);
    router.push("/cart");
  };

  const handleWish = () => {
    setWished(toggleWishlist(productId));
    window.dispatchEvent(new Event("scentury:wishlist"));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04]">
        <button
          onClick={() => setQty((v) => Math.max(1, v - 1))}
          disabled={disabled}
          className="h-12 w-11 text-lg text-zinc-300 transition-colors hover:text-gold-200 disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="w-10 text-center text-sm font-bold text-zinc-100">{qty}</span>
        <button
          onClick={() => setQty((v) => Math.min(99, v + 1))}
          disabled={disabled}
          className="h-12 w-11 text-lg text-zinc-300 transition-colors hover:text-gold-200 disabled:opacity-40"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <button
        onClick={handleAdd}
        disabled={disabled}
        className={`btn h-12 px-8 ${added ? "border border-emerald-400/50 bg-emerald-400/15 text-emerald-200" : "btn-gold"}`}
      >
        {added ? "Added to cart ✓" : "Add to cart"}
      </button>

      <button
        onClick={handleBuyNow}
        disabled={disabled}
        className="btn btn-ghost h-12 px-8"
      >
        Buy now
      </button>

      <button
        onClick={handleWish}
        aria-label="Toggle wishlist"
        className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all ${
          wished
            ? "border-gold-400/60 bg-gold-400/20 text-gold-300"
            : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-gold-400/40 hover:text-gold-300"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      </button>
    </div>
  );
}
