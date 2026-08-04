import type { Metadata } from "next";
import ShopClient from "@/components/shop-client";
import { PRODUCTS } from "@/lib/products";

export const metadata: Metadata = {
  title: "Shop All Fragrances",
  description:
    "Browse the full Scentury21 collection — extraits, eaux de parfum and eaux de toilette with search, filters and sorting.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const initialCategory =
    typeof cat === "string" && cat.length > 0 && cat.length < 40 ? cat : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold-400">The collection</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-zinc-50 sm:text-5xl">
          Shop fragrances
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Twelve signatures, three concentrations, one obsession. Search, filter and
          sort to find yours.
        </p>
      </div>
      <ShopClient products={PRODUCTS} initialCategory={initialCategory} />
    </div>
  );
}
