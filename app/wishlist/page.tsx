"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getWishlist } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { mapProductRow, type Product, type ProductRow } from "@/lib/products";
import ProductCard from "@/components/product-card";

export default function WishlistPage() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      setCatalog((data ?? []).map((row) => mapProductRow(row as ProductRow)));
    })();
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("scentury:wishlist", refresh);
    return () => window.removeEventListener("scentury:wishlist", refresh);
  }, []);

  const products = useMemo(() => {
    void tick; // recompute when the wishlist storage changes
    const ids = getWishlist();
    return ids
      .map((id) => catalog.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [catalog, tick]);

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <div className="text-6xl">🤍</div>
        <h1 className="mt-6 font-display text-4xl font-semibold text-zinc-50">Your wishlist is empty</h1>
        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          Tap the heart on any fragrance to save it here for later.
        </p>
        <Link href="/shop" className="btn btn-gold mt-8">Discover fragrances →</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-zinc-50">Your wishlist</h1>
      <p className="mt-2 text-sm text-zinc-400">{products.length} saved fragrance{products.length > 1 ? "s" : ""}</p>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
