"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/products";
import ProductCard from "./product-card";

type SortKey = "newest" | "featured" | "price-asc" | "price-desc" | "rating" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "rating", label: "Top rated" },
  { key: "name", label: "Name A-Z" },
];

const ENTRANCE_DELAYS = ["", "delay-100", "delay-200", "delay-300"];

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

  const countFor = (c: string) =>
    c === "All" ? products.length : products.filter((p) => p.category === c).length;

  const familyCount = new Set(products.map((p) => p.family).filter(Boolean)).size;

  return (
    <div>
      {/* ----------------------------- Shop hero ----------------------------- */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-gold-400/15 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 px-6 py-10 sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.3em] text-gold-400">
            <span className="h-px w-7 bg-gradient-to-r from-transparent to-gold-400/70" />
            The Collection
            <span className="h-px w-7 bg-gradient-to-l from-transparent to-gold-400/70" />
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl">
            Available <span className="gold-text">Perfumes</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
            Hand-finished oils and sprays — rare ingredients, made to linger.
            Search by name, note or family, then filter the collection your way.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-gold-400/25 bg-gold-400/[0.08] px-3 py-1.5 font-semibold text-gold-200">
              {products.length} fragrances
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-semibold text-zinc-300">
              {familyCount} scent families
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-semibold text-zinc-300">
              Small-batch blends
            </span>
          </div>
        </div>
      </div>

      {/* --------------------------- Search + sort --------------------------- */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
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
            className="input pl-11 pr-10"
            aria-label="Search fragrances"
          />
          {q.length > 0 && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-gold-200"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative shrink-0 lg:w-56">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort fragrances"
            className="w-full cursor-pointer appearance-none rounded-full border border-white/15 bg-white/[0.03] py-2.5 pl-4 pr-10 text-xs font-semibold text-zinc-200 outline-none transition-colors hover:border-gold-400/40"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gold-400/80"
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

      {/* ------------------------ Category pills (counts) ---------------------- */}
      <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300 ${
              cat === c
                ? "border-transparent bg-[#e5b25d] text-[#1c1407] shadow-[0_6px_20px_-6px_rgba(229,178,93,0.6)]"
                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-gold-400/40 hover:text-gold-200"
            }`}
          >
            {c}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none ${
                cat === c
                  ? "bg-[#1c1407]/15 text-[#1c1407]"
                  : "bg-white/[0.06] text-zinc-400"
              }`}
            >
              {countFor(c)}
            </span>
          </button>
        ))}
      </div>

      {/* ----------------------------- Results count -------------------------- */}
      <p className="mt-7 flex items-baseline gap-2 text-sm text-zinc-400">
        <span className="font-display text-xl font-bold text-gold-300">{filtered.length}</span>
        <span>
          fragrance{filtered.length === 1 ? "" : "s"}
          {cat !== "All" ? ` in ${cat}` : ""}
          {q.trim() ? ` matching “${q.trim()}”` : ""}
        </span>
      </p>

      {/* --------------------------------- Grid ------------------------------- */}
      {filtered.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <div key={p.id} className={`animate-fade-up h-full ${ENTRANCE_DELAYS[i % 4]}`}>
              <ProductCard product={p} variant="dark" />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass mt-6 rounded-2xl p-14 text-center">
          <div className="text-5xl">🫙</div>
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
