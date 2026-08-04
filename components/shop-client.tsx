"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/products";
import ProductCard from "./product-card";

type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "name";

const SORTS: { key: SortKey; label: string }[] = [
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
  const [sort, setSort] = useState<SortKey>("featured");

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
      default:
        list = [...list].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    }
    return list;
  }, [products, q, cat, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
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

        <div className="flex items-center gap-3">
          <label htmlFor="sort" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input w-auto cursor-pointer"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`chip ${cat === c ? "chip-active" : ""}`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        {filtered.length} fragrance{filtered.length === 1 ? "" : "s"}
        {cat !== "All" ? ` in ${cat}` : ""}
        {q.trim() ? ` matching “${q.trim()}”` : ""}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="glass mt-6 rounded-2xl p-14 text-center">
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
