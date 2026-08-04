"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatNGN, nairaToUsd } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { isWishlisted, toggleWishlist } from "@/lib/store";
import { useEffect, useState } from "react";
import ProductBottle from "./product-bottle";
import Stars from "./stars";

const TAG_STYLES: Record<NonNullable<Product["tag"]>, string> = {
  Bestseller: "bg-gold-400/15 text-gold-200 border-gold-400/40",
  New: "bg-emerald-400/15 text-emerald-200 border-emerald-400/40",
  Limited: "bg-fuchsia-400/15 text-fuchsia-200 border-fuchsia-400/40",
};

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setWished(isWishlisted(product.id));
  }, [product.id]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  const handleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWished(toggleWishlist(product.id));
    window.dispatchEvent(new Event("scentury:wishlist"));
  };

  return (
    <Link
      href={`/product/${product.id}`}
      className="group card-hover relative flex flex-col overflow-hidden rounded-2xl glass"
    >
      {/* Art area */}
      <div
        className="relative flex h-56 items-center justify-center overflow-hidden"
        style={{
          background: `radial-gradient(120% 120% at 50% 0%, ${product.palette[0]}26 0%, transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))`,
        }}
      >
        {product.tag && (
          <span
            className={`absolute left-3 top-3 z-10 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${TAG_STYLES[product.tag]}`}
          >
            {product.tag}
          </span>
        )}
        <button
          onClick={handleWish}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition-all duration-300 ${
            wished
              ? "border-gold-400/60 bg-gold-400/20 text-gold-300"
              : "border-white/10 bg-white/5 text-zinc-400 hover:text-gold-300 hover:border-gold-400/40"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        <div className="animate-floaty transition-transform duration-500 group-hover:scale-110">
          <ProductBottle product={product} className="h-44 w-auto drop-shadow-2xl" />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-400/80">
          {product.category} · {product.size}
        </div>
        <h3 className="font-display text-xl font-semibold leading-tight text-zinc-100">
          {product.name}
        </h3>
        <p className="line-clamp-1 text-xs text-zinc-400">{product.subtitle}</p>
        <div className="flex items-center gap-1.5">
          <Stars rating={product.rating} size={12} />
          <span className="text-[11px] text-zinc-500">
            {product.rating.toFixed(1)} ({product.reviewsCount})
          </span>
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="font-display text-lg font-bold text-gold-200">{formatNGN(product.price)}</div>
            <div className="text-[10px] text-zinc-500">≈ {nairaToUsd(product.price)}</div>
          </div>
          <button
            onClick={handleAdd}
            className={`btn px-4 py-2 text-xs ${added ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40" : "btn-gold"}`}
          >
            {added ? "Added ✓" : "Add to cart"}
          </button>
        </div>
      </div>
    </Link>
  );
}
