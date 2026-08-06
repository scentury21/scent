import type { Metadata } from "next";
import ShopClient from "@/components/shop-client";
import { getActiveProducts } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Shop All Fragrances",
  description:
    "Browse the full Scentury21 collection — oil and spray perfumes with search, filters and sorting.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const initialCategory =
    typeof cat === "string" && cat.length > 0 && cat.length < 40 ? cat : undefined;

  const products = await getActiveProducts();

  return (
    <div className="force-dark relative overflow-hidden" style={{ backgroundColor: "#12110f" }}>
      {/* Ambient gold glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-gold-400/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-gold-500/5 blur-[120px]" />

      {/* Smooth blend from the themed header into the dark section */}
      <div className="shop-blend relative h-16 sm:h-20" />

      <div className="relative mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <ShopClient products={products} initialCategory={initialCategory} />
      </div>
    </div>
  );
}
