import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProducts, getDbProduct, getProductReviews } from "@/lib/products-server";
import { formatNGN, nairaToUsd, formatDate } from "@/lib/currency";
import ProductCard from "@/components/product-card";
import ProductVisual from "@/components/product-visual";
import Stars from "@/components/stars";
import AddToCartPanel from "@/components/add-to-cart";
import ReviewForm from "@/components/review-form";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getDbProduct(id);
  if (!product) return { title: "Fragrance not found" };
  return {
    title: product.name,
    description: product.subtitle,
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const product = await getDbProduct(id);
  if (!product) notFound();

  const allProducts = await getActiveProducts();
  const recommendations = allProducts
    .filter(
      (p) => p.id !== product.id && (p.family === product.family || p.category === product.category)
    )
    .slice(0, 4)
    .concat(
      allProducts.filter((p) => p.id !== product.id && p.family !== product.family).slice(0, 4)
    )
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 4);

  const reviews = await getProductReviews(product.id);
  const outOfStock = product.stock <= 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/" className="transition-colors hover:text-gold-300">Home</Link>
        <span>/</span>
        <Link href="/shop" className="transition-colors hover:text-gold-300">Shop</Link>
        <span>/</span>
        <span className="text-zinc-300">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Art — 2D bottle or photo, with a lazy-loaded interactive 3D mode */}
        <ProductVisual product={product} />

        {/* Details */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gold-400">
            {product.category} · {product.size}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-zinc-50 sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-2 text-lg text-zinc-400">{product.subtitle}</p>

          <div className="mt-4 flex items-center gap-2">
            <Stars rating={product.rating} size={16} />
            <span className="text-sm text-zinc-400">
              {product.rating.toFixed(1)} · {product.reviewsCount} reviews
            </span>
          </div>

          <div className="mt-6 flex items-end gap-3">
            <span className="font-display text-4xl font-bold gold-text">{formatNGN(product.price)}</span>
            <span className="pb-1 text-sm text-zinc-500">≈ {nairaToUsd(product.price)}</span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {outOfStock ? (
              <span className="rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 text-red-300">
                Out of stock — join restock alerts
              </span>
            ) : product.stock <= 8 ? (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-300">
                Low stock — only {product.stock} left
              </span>
            ) : (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-300">
                In stock · ships in 1–2 days
              </span>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-zinc-300">{product.description}</p>

          {/* Notes */}
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold-300">Fragrance notes</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Top", product.notes.top],
                  ["Heart", product.notes.heart],
                  ["Base", product.notes.base],
                ] as const
              ).map(([label, notes]) => (
                <div key={label} className="glass rounded-2xl p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    {label} notes
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {notes.map((n) => (
                      <span
                        key={n}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase panel */}
          <div className="mt-8">
            <AddToCartPanel productId={product.id} disabled={outOfStock} />
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-semibold text-zinc-50">
            What collectors say
          </h2>
          <span className="text-sm text-zinc-500">
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center text-sm text-zinc-500 sm:col-span-2">
                No reviews yet — be the first to share your scent story.
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ink-600 to-ink-800 text-sm font-bold text-gold-200">
                        {r.author.charAt(0)}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">{r.author}</div>
                        <div className="text-[11px] text-zinc-500">{formatDate(r.createdAt)}</div>
                      </div>
                    </div>
                    <Stars rating={r.rating} size={13} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">“{r.text}”</p>
                  {r.verified && (
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      Verified purchase
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
          <ReviewForm productId={product.id} />
        </div>
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-3xl font-semibold text-zinc-50">You may also love</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {recommendations.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
