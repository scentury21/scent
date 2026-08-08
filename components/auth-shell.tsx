import type { ReactNode } from "react";
import Link from "next/link";
import ChromaticWaves from "./chromatic-waves";

const PERKS = [
  "40+ countries with GPS-precise delivery",
  "Paystack-secured checkout or WhatsApp ordering",
  "Small-batch extraits, blended in Lagos",
];

export default function AuthShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] min-h-[calc(100dvh-4rem)] max-w-6xl items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
      <div className="animate-fade-up grid w-full overflow-hidden rounded-[1.75rem] glass-flat lg:grid-cols-[1fr_1.15fr] lg:shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)]">
        {/* Brand panel — hidden on small screens */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] p-10 lg:flex">
          <ChromaticWaves
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]"
            intensity={0.7}
          />
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" />

          <div className="relative">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-xl font-bold text-ink-950 shadow-[0_6px_20px_-6px_rgba(212,169,74,0.7)]">
                S
              </span>
              <span className="font-display text-xl font-bold tracking-[0.14em] text-zinc-100">
                SCENTURY<span className="gold-text">21</span>
              </span>
            </Link>

            <p className="mt-10 font-display text-3xl font-semibold leading-[1.15] text-zinc-50">
              Luxury perfume,{" "}
              <span className="gold-text">poured into light.</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Hand-blended extraits and eaux de parfum from rare ingredients —
              oud, damask rose, saffron. Delivered precisely to your door.
            </p>
          </div>

          <ul className="relative mt-12 space-y-3.5">
            {PERKS.map((perk) => (
              <li
                key={perk}
                className="flex items-center gap-3 text-sm text-zinc-300"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400/15 text-[10px] text-gold-300">
                  ✓
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <p className="relative mt-12 font-display text-lg italic text-zinc-500">
            “Perfume is the most intense form of memory. We simply bottle it.”
          </p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
