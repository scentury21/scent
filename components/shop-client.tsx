"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/products";
import ProductCard from "./product-card";
import ProductBottle from "./product-bottle";

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

/** Editorial tagline shown inside the hero card. */
const HERO_TAGLINES = [
  { eyebrow: "Signature Blend", title: "Amber & oud,\nworn like silk." },
  { eyebrow: "Rare Extracts", title: "Saffron smoke,\nbottled at dusk." },
  { eyebrow: "Small Batch", title: "Thirteen scents.\nZero compromises." },
  { eyebrow: "The Library", title: "Find the scent\nthat finds you." },
];

function taglineFor(p: Product) {
  let h = 0;
  for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HERO_TAGLINES[h % HERO_TAGLINES.length];
}

/* --------------------------- tiny sub-components --------------------------- */

function Glow({ className }: { className: string }) {
  return <div aria-hidden className={`pointer-events-none absolute rounded-full blur-3xl animate-glow ${className}`} />;
}

function SpotlightBottle({ product }: { product: Product }) {
  return (
    <div className="relative flex h-full min-h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-gold-400/[0.14] via-transparent to-transparent">
      <Glow className="left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 bg-gold-400/20" />
      <div
        aria-hidden
        className="absolute inset-x-6 top-1/2 h-px -translate-y-16 bg-gradient-to-r from-transparent via-gold-400/40 to-transparent"
      />
      <div className="animate-floaty drop-shadow-2xl">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="h-32 w-auto rounded-lg object-cover shadow-2xl sm:h-40" />
        ) : (
          <div className="scale-125 sm:scale-150">
            <ProductBottleLazy product={product} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Bottle render used by the spotlight card. */
function ProductBottleLazy({ product }: { product: Product }) {
  return <ProductBottle product={product} className="h-32 w-auto drop-shadow-2xl sm:h-40" />;
}

function NoteChips({ notes, tone = "gold" }: { notes: string[]; tone?: "gold" | "plum" }) {
  if (notes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {notes.slice(0, 3).map((n) => (
        <span
          key={n}
          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur ${
            tone === "gold"
              ? "border-gold-400/25 bg-gold-400/[0.08] text-gold-200"
              : "border-fuchsia-400/25 bg-fuchsia-400/[0.08] text-fuchsia-200"
          }`}
        >
          {n}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------- main view -------------------------------- */

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
  const [now, setNow] = useState(() => new Date());
  const [offerSeconds, setOfferSeconds] = useState(4 * 3600 + 12 * 60 + 30);

  // Deterministic "Scent of the Day": same product for everyone, rotates daily.
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  const spotlight = useMemo(() => {
    if (products.length === 0) return null;
    return products[dayIndex % products.length];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, dayIndex]);

  const tagline = useMemo(() => (spotlight ? taglineFor(spotlight) : HERO_TAGLINES[0]), [spotlight]);

  const sortedForHero = useMemo(() => {
    const hero = [...products].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    return hero;
  }, [products]);

  // Midnight-local countdown reset.
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setNow(d);
      const midnight = new Date(d);
      midnight.setHours(24, 0, 0, 0);
      setOfferSeconds(Math.floor((midnight.getTime() - d.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(Math.floor(offerSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((offerSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(offerSeconds % 60).padStart(2, "0");

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
  const allNotes = useMemo(
    () => Array.from(new Set(products.flatMap((p) => [...p.notes.top, ...p.notes.heart, ...p.notes.base]))).slice(0, 12),
    [products],
  );

  if (products.length === 0) {
    return (
      <div className="glass rounded-2xl p-14 text-center">
        <div className="text-5xl">🫙</div>
        <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-100">The collection is being curated</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">Check back soon — new blends are resting.</p>
      </div>
    );
  }

  const hero = spotlight!;
  const mosaic = sortedForHero.slice(0, 3);
  const featured = sortedForHero.find((p) => p.featured) ?? sortedForHero[0];

  return (
    <div>
      {/* ===================== Mosaic hero grid (bento) ===================== */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:grid-rows-2">
        {/* Signature spotlight — tall card */}
        <Link
          href={`/product/${hero.id}`}
          className="group relative row-span-2 overflow-hidden rounded-[1.75rem] border border-gold-400/20 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-6 transition-all duration-500 hover:border-gold-400/45 hover:shadow-[0_24px_60px_-24px_rgba(213,157,58,0.35)] sm:p-8"
        >
          <Glow className="-right-10 -top-10 h-48 w-48 bg-gold-400/15" />
          <Glow className="-bottom-16 -left-10 h-48 w-48 bg-fuchsia-400/10" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/70 to-transparent" />

          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-gold-400">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-gold-400/70" />
            Scent of the day
          </p>
          <h2 className="mt-3 whitespace-pre-line font-display text-3xl font-semibold leading-[1.1] text-zinc-50 sm:text-4xl">
            {tagline.title}
          </h2>
          <div className="mt-4">
            <NoteChips notes={[...hero.notes.top, ...hero.notes.heart]} />
          </div>

          <div className="mt-5">
            <SpotlightBottle product={hero} />
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-xl font-semibold text-zinc-50">{hero.name}</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {hero.category} · {hero.size}
              </p>
            </div>
            <span className="rounded-full bg-gradient-to-b from-[#f3d288] to-[#d59d3a] px-4 py-2 text-xs font-bold text-[#1c1407] shadow-[0_10px_28px_-10px_rgba(213,157,58,0.55)] transition-transform duration-300 group-hover:scale-105">
              Explore →
            </span>
          </div>
        </Link>

        {/* Top-right card — most wanted */}
        {mosaic[0] && (
          <Link
            href={`/product/${mosaic[0].id}`}
            className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 transition-all duration-500 hover:border-gold-400/35 sm:p-7"
          >
            <Glow className="-right-8 -top-8 h-36 w-36 bg-cyan-400/10" />
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200/80">Most wanted</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="shrink-0">
                {mosaic[0].image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mosaic[0].image} alt={mosaic[0].name} className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/10" />
                ) : (
                  <ProductBottle product={mosaic[0]} className="h-20 w-auto drop-shadow-xl" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-zinc-50">{mosaic[0].name}</p>
                <p className="truncate text-[11px] text-zinc-400">{mosaic[0].subtitle}</p>
                <div className="mt-2">
                  <NoteChips notes={mosaic[0].notes.heart} tone="plum" />
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Mid-right card — limited edition */}
        {mosaic[1] && (
          <Link
            href={`/product/${mosaic[1].id}`}
            className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-900/80 p-6 transition-all duration-500 hover:border-fuchsia-400/35 sm:p-7"
          >
            <Glow className="-left-8 -bottom-8 h-36 w-36 bg-fuchsia-400/10" />
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-fuchsia-200/80">Limited edition</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="shrink-0">
                {mosaic[1].image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mosaic[1].image} alt={mosaic[1].name} className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/10" />
                ) : (
                  <ProductBottle product={mosaic[1]} className="h-20 w-auto drop-shadow-xl" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-zinc-50">{mosaic[1].name}</p>
                <p className="truncate text-[11px] text-zinc-400">{mosaic[1].subtitle}</p>
                <div className="mt-2">
                  <NoteChips notes={mosaic[1].notes.base} tone="plum" />
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ====================== Note discovery chips ======================== */}
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Explore notes</span>
        {allNotes.map((n) => (
          <button
            key={n}
            onClick={() => {
              setQ(n);
              setCat("All");
            }}
            className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 ${
              q.trim().toLowerCase() === n.toLowerCase()
                ? "border-transparent bg-[#e5b25d] text-[#1c1407]"
                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-gold-400/40 hover:text-gold-200"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* ====================== Featured banner + offer ====================== */}
      <div className="relative mt-4 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-ink-900 via-ink-850 to-ink-900 px-6 py-5 sm:px-8">
        <Glow className="-left-10 top-1/2 h-40 w-40 -translate-y-1/2 bg-gold-400/10" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold-400">House signature</p>
            <p className="mt-1 truncate font-display text-xl font-semibold text-zinc-50 sm:text-2xl">
              {featured.name} <span className="gold-text">— our most-loved blend</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-label="Offer ends at midnight">
              {[hh, mm, ss].map((v, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="rounded-lg border border-gold-400/25 bg-gold-400/[0.08] px-2 py-1 font-mono text-sm font-bold tabular-nums text-gold-200">
                    {v}
                  </span>
                  {i < 2 && <span className="text-gold-400/60">:</span>}
                </span>
              ))}
            </div>
            <Link href={`/product/${featured.id}`} className="btn btn-gold shrink-0 px-5 py-2.5 text-xs">
              View scent
            </Link>
          </div>
        </div>
      </div>

      {/* ======================= Search + sort bar ========================== */}
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

      {/* ===================== Category pills (counts) ====================== */}
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
                cat === c ? "bg-[#1c1407]/15 text-[#1c1407]" : "bg-white/[0.06] text-zinc-400"
              }`}
            >
              {countFor(c)}
            </span>
          </button>
        ))}
      </div>

      {/* ========================== Results count =========================== */}
      <p className="mt-7 flex items-baseline gap-2 text-sm text-zinc-400">
        <span className="font-display text-xl font-bold text-gold-300">{filtered.length}</span>
        <span>
          fragrance{filtered.length === 1 ? "" : "s"}
          {cat !== "All" ? ` in ${cat}` : ""}
          {q.trim() ? ` matching “${q.trim()}”` : ""}
        </span>
        <span className="ml-auto hidden text-xs text-zinc-500 sm:block">
          {familyCount} scent families · small-batch blends
        </span>
      </p>

      {/* ============================== Grid ================================ */}
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
          <h3 className="mt-3 font-display text-2xl font-semibold text-zinc-100">Nothing matches that search</h3>
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

      {/* ========================= Collect strip ============================ */}
      <div className="relative mt-10 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-ink-850 via-ink-900 to-ink-950 px-6 py-8 text-center sm:px-10">
        <Glow className="left-1/4 top-0 h-32 w-32 bg-gold-400/10" />
        <Glow className="right-1/4 bottom-0 h-32 w-32 bg-fuchsia-400/10" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold-400">The Scentury21 ritual</p>
        <h3 className="mx-auto mt-3 max-w-lg font-display text-2xl font-semibold leading-snug text-zinc-50 sm:text-3xl">
          Never settle for <span className="gold-text">one signature.</span>
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Build a wardrobe of moods — day oils, evening sprays, limited drops.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {sortedForHero.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 transition-all duration-300 hover:border-gold-400/40"
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span
                  className="h-7 w-7 rounded-full ring-1 ring-white/10"
                  style={{ background: `linear-gradient(135deg, ${p.palette[0]}, ${p.palette[1]})` }}
                />
              )}
              <span className="text-[11px] font-semibold text-zinc-300 group-hover:text-gold-200">{p.name}</span>
            </Link>
          ))}
          <Link
            href="/#collection"
            className="rounded-full bg-gradient-to-b from-[#f3d288] to-[#d59d3a] px-4 py-2 text-[11px] font-bold text-[#1c1407] shadow-[0_8px_24px_-8px_rgba(213,157,58,0.6)] transition-transform duration-300 hover:scale-105"
          >
            View all →
          </Link>
        </div>
      </div>
    </div>
  );
}
