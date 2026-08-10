"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatNGN, nairaToUsd } from "@/lib/currency";
import { useCart } from "@/lib/cart";
import { isWishlisted, toggleWishlist } from "@/lib/store";
import { useEffect, useState } from "react";
import ProductBottle from "./product-bottle";
import Stars from "./stars";
import { showToast } from "./toast";

const TAG_STYLES: Record<NonNullable<Product["tag"]>, string> = {
  Bestseller: "bg-gold-400/15 text-gold-200 border-gold-400/40",
  New: "bg-emerald-400/15 text-emerald-200 border-emerald-400/40",
  Limited: "bg-fuchsia-400/15 text-fuchsia-200 border-fuchsia-400/40",
};

export default function ProductCard({
  product,
  variant = "glass",
}: {
  product: Product;
  variant?: "glass" | "dark";
}) {
  const dark = variant === "dark";
  const { addItem } = useCart();
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setWished(isWishlisted(product.id)));
  }, [product.id]);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product.id, 1);
    setAdded(true);
    window.dispatchEvent(new Event("scentury:cart-added"));
    showToast(`${product.name} added to cart`);
    window.setTimeout(() => setAdded(false), 1400);
  };

  const handleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWished(toggleWishlist(product.id));
    window.dispatchEvent(new Event("scentury:wishlist"));
  };

  const addClass = added
    ? "btn mt-2.5 w-full py-2 text-xs border border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
    : dark
      ? "mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#f3d288] to-[#d59d3a] px-6 py-2.5 text-xs font-bold text-[#1c1407] shadow-[0_10px_28px_-10px_rgba(213,157,58,0.55)] hover:brightness-105 hover:shadow-[0_14px_36px_-10px_rgba(213,157,58,0.7)] active:scale-[0.98]"
      : "btn btn-gold mt-2.5 w-full py-2 text-xs";

  return (
    <Link
      href={`/product/${product.id}`}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl ${
        dark ? "premium-card" : "glass card-hover"
      }`}
    >
      {/* Gold hairline along the top of the premium card */}
      {dark && (
        <span className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />
      )}

      {/* Art area */}
      <div
        className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden ${
          dark ? "ring-1 ring-inset ring-gold-400/10" : ""
        }`}
        style={{
          background: `radial-gradient(120% 120% at 50% 0%, ${product.palette[0]}26 0%, transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))`,
        }}
      >
        {dark ? (
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap items-center gap-1.5">
            {product.stock > 0 ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-950/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-300 backdrop-blur">
                In stock
              </span>
            ) : (
              <span className="rounded-full border border-red-400/20 bg-red-950/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-300 backdrop-blur">
                Out of stock
              </span>
            )}
            {product.tag && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur ${TAG_STYLES[product.tag]}`}
              >
                {product.tag}
              </span>
            )}
          </div>
        ) : (
          product.tag && (
            <span
              className={`absolute left-2.5 top-2.5 z-10 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${TAG_STYLES[product.tag]}`}
            >
              {product.tag}
            </span>
          )
        )}
        <button
          onClick={handleWish}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur transition-all duration-300 ${
            wished
              ? "border-gold-400/60 bg-gold-400/20 text-gold-300"
              : "border-white/10 bg-white/5 text-zinc-400 hover:border-gold-400/40 hover:text-gold-300"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
        </button>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="animate-floaty transition-transform duration-500 group-hover:scale-110">
            <ProductBottle
              product={product}
              className={`h-24 w-auto drop-shadow-xl ${dark ? "" : "sm:h-36"}`}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {!dark && (
          <div className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-gold-400/80 sm:text-[10px]">
            {product.category} · {product.size}
          </div>
        )}
        <h3
          className={`line-clamp-1 font-display font-semibold leading-snug text-zinc-50 ${
            dark ? "text-lg sm:text-xl" : "text-base sm:text-lg"
          }`}
        >
          {product.name}
        </h3>
        <p className="line-clamp-1 text-[11px] text-zinc-400 sm:text-xs">{product.subtitle}</p>
        {!dark && (
          <div className="flex items-center gap-1.5">
            <Stars rating={product.rating} size={12} />
            <span className="text-[11px] text-zinc-500">
              {product.rating.toFixed(1)} ({product.reviewsCount})
            </span>
          </div>
        )}

        <div className="mt-auto pt-2">
          <div className="flex items-end justify-between gap-2">
            <div
              className={`font-display font-bold tracking-tight ${
                dark ? "text-lg text-gold-300 sm:text-xl" : "text-base text-gold-200 sm:text-lg"
              }`}
            >
              {formatNGN(product.price)}
            </div>
            {!dark && <div className="text-[10px] text-zinc-500">≈ {nairaToUsd(product.price)}</div>}
          </div>
          <button onClick={handleAdd} className={addClass}>
            {added ? (
              "Added ✓"
            ) : (
              <>
                <svg
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                Add to cart
              </>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
