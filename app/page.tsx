import Link from "next/link";
import ChromaticWaves from "@/components/chromatic-waves";
import ProductCard from "@/components/product-card";
import { BEST_SELLERS, NEW_ARRIVALS } from "@/lib/products";

const FEATURES = [
  {
    icon: "🌍",
    title: "Worldwide delivery",
    text: "Choose from 40+ countries with a dynamic state/region selector — and pin your exact delivery spot with GPS.",
  },
  {
    icon: "💳",
    title: "Paystack secured",
    text: "Pay online in naira with Paystack, or order the classic way on WhatsApp. Verified server-side before dispatch.",
  },
  {
    icon: "💬",
    title: "Order on WhatsApp",
    text: "Prefer to chat? Message us directly — a real person confirms your order and delivery details.",
  },
  {
    icon: "🎁",
    title: "Small-batch artistry",
    text: "Rare ingredients, hand-blended in small batches. When a batch sells out, we craft the next one fresh.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* ------------------------------ HERO ------------------------------ */}
      <section className="relative -mx-4 overflow-hidden sm:-mx-6">
        <ChromaticWaves
          className="absolute inset-0 h-full w-full"
          intensity={0.9}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-transparent to-ink-950" />
        <div className="relative mx-auto flex min-h-[82vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
          <span className="animate-fade-up rounded-full border border-gold-400/40 bg-gold-400/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-gold-200">
            The House of Scentury21
          </span>
          <h1 className="animate-fade-up delay-100 mt-6 font-display text-5xl font-bold leading-[1.05] text-zinc-50 sm:text-7xl">
            Luxury perfume,
            <br />
            <span className="gold-text">poured into light.</span>
          </h1>
          <p className="animate-fade-up delay-200 mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Hand-blended extraits and eaux de parfum from rare ingredients — oud,
            damask rose, saffron. Delivered precisely to your door, anywhere in the
            world.
          </p>
          <div className="animate-fade-up delay-300 mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/shop" className="btn btn-gold px-8 py-3.5 text-base">
              Shop the collection
              <span aria-hidden>→</span>
            </Link>
            <Link href="#house" className="btn btn-ghost px-8 py-3.5 text-base">
              Explore the house
            </Link>
          </div>

          <div className="animate-fade-up delay-400 mt-14 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["12", "signature scents"],
              ["40+", "delivery countries"],
              ["4.9★", "average rating"],
              ["₦0", "shipping over ₦250k"],
            ].map(([n, l]) => (
              <div key={l} className="glass rounded-2xl px-3 py-4">
                <div className="font-display text-2xl font-bold text-gold-200">{n}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-400">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- BESTSELLERS --------------------------- */}
      <section className="mt-20">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold-400">Most loved</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-zinc-50 sm:text-4xl">
              The bestsellers
            </h2>
          </div>
          <Link href="/shop" className="hidden text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200 sm:block">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BEST_SELLERS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ------------------------------ STORY ------------------------------ */}
      <section id="house" className="mt-28 scroll-mt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold-400">The house</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-zinc-50 sm:text-5xl">
              Scent, composed <span className="chroma-text">like music.</span>
            </h2>
            <p className="mt-5 leading-relaxed text-zinc-400">
              Every Scentury21 fragrance is an olfactive score in three movements.
              We open with a sparkling <em>top</em>, unfold through a floral or woody{" "}
              <em>heart</em>, and close on a deep, lingering <em>base</em>. No
              shortcuts, no synthetic filler — just rare materials, aged and blended
              with patience.
            </p>
            <div className="mt-8 space-y-4">
              {[
                ["Top notes", "The first 15 minutes — bright, sparkling, immediate.", "from-gold-300 to-gold-500", "80%"],
                ["Heart notes", "The soul of the scent — blooms 30 minutes in.", "from-fuchsia-400 to-violet-500", "60%"],
                ["Base notes", "The memory — lasts 8 to 12 hours on skin.", "from-cyan-400 to-blue-500", "40%"],
              ].map(([t, d, g, w]) => (
                <div key={t} className="glass rounded-2xl p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-lg font-semibold text-zinc-100">{t}</span>
                    <span className="text-[11px] text-zinc-500">{w} of the dry-down</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{d}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full bg-gradient-to-r ${g}`} style={{ width: w }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-gold-400/10 via-fuchsia-400/10 to-cyan-400/10 blur-2xl" />
            <div className="relative glass overflow-hidden rounded-[2rem] p-8">
              <p className="font-display text-2xl font-semibold leading-snug text-zinc-100">
                “Perfume is the most intense form of memory. We simply bottle it.”
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-display text-lg font-bold text-ink-950">
                  S
                </span>
                <div>
                  <div className="text-sm font-semibold text-zinc-200">The Scentury21 atelier</div>
                  <div className="text-xs text-zinc-500">Founders' note</div>
                </div>
              </div>
              <div className="divider-fade my-8" />
              <div className="grid grid-cols-3 gap-4 text-center">
                {[["38", "rare ingredients"], ["6 mo", "avg. maturation"], ["100%", "cruelty free"]].map(([n, l]) => (
                  <div key={l}>
                    <div className="font-display text-2xl font-bold gold-text">{n}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-wider text-zinc-500">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------- NEW ARRIVALS --------------------------- */}
      <section className="mt-28">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold-400">Fresh from the atelier</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-zinc-50 sm:text-4xl">
              New arrivals
            </h2>
          </div>
          <Link href="/shop" className="hidden text-sm font-semibold text-gold-300 transition-colors hover:text-gold-200 sm:block">
            View all →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {NEW_ARRIVALS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ----------------------------- FEATURES ---------------------------- */}
      <section className="mt-28">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass card-hover rounded-2xl p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] text-2xl">
                {f.icon}
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="mt-28">
        <div className="relative overflow-hidden rounded-[2rem] border border-gold-400/20 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-3xl" />
          <h2 className="relative font-display text-3xl font-semibold text-zinc-50 sm:text-5xl">
            Find the scent that <span className="gold-text">finds you.</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-zinc-400">
            Bestsellers, limited extraits and new arrivals — shipped worldwide with
            precise GPS delivery.
          </p>
          <Link href="/shop" className="btn btn-gold relative mt-8 px-10 py-4 text-base">
            Browse all fragrances →
          </Link>
        </div>
      </section>
    </div>
  );
}
