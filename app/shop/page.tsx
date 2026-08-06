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
    <div className="force-dark" style={{ backgroundColor: "#12110f" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ShopClient products={products} initialCategory={initialCategory} />
      </div>
    </div>
  );
}
