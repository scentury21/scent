"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/products";
import ProductCard from "./product-card";

type SortKey = "newest" | "featured" | "price-asc" | "price-desc" | "rating" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low → high" },
  { key: "price-desc", label: "Price: high → low" },
  { key: "rating", label: "Top rated" },
  { key: "name", label: "Name A–Z" },
];

export default function ShopClient({
  products,
  initialCategory,
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(initialCategory ?? "All");
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesCat = cat === "All" || p.category === cat;
      const haystack = [
        p.name,
        p.subtitle,
        p.category,
        p.family,
        p.description,
        ...p.notes.top,
        ...p.notes.heart,
        ...p.notes.base,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQ = !query || haystack.includes(query);
      return matchesCat && matchesQ;
    });

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
        break;
      case "name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "featured":
        list = [...list].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
        break;
      default:
        list = [...list];
    }
    return list;
  }, [products, q, cat, sort]);

  return (
    <div>
      {/* Category pills — scrollable row */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 ${
              cat === c
                ? "border-transparent bg-[#e5b25d] text-[#1c1407]"
                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-gold-400/40 hover:text-gold-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Heading + sort */}
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold text-zinc-50 sm:text-4xl">
          Available Perfumes
        </h1>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort fragrances"
            className="cursor-pointer appearance-none rounded-full border border-white/15 bg-white/[0.03] py-2 pl-4 pr-10 text-xs font-semibold text-zinc-200 outline-none transition-colors hover:border-gold-400/40"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes, families, names…"
          className="input pl-11"
          aria-label="Search fragrances"
        />
      </div>

      {/* Results count */}
      <p className="mt-6 text-sm text-zinc-400">
        {filtered.length} fragrance{filtered.length === 1 ? "" : "s"}
        {cat !== "All" ? ` in ${cat}` : ""}
        {q.trim() ? ` matching “${q.trim()}”` : ""}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} variant="dark" />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#1a1713] p-14 text-center">
          <div className="text-4xl">🫙</div>
          <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-100">
            Nothing matches that search
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            Try a different note — “oud”, “rose”, “vanilla” — or clear your filters.
          </p>
          <button
            onClick={() => {
              setQ("");
              setCat("All");
            }}
            className="btn btn-gold mt-6"
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
