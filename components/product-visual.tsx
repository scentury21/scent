"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Product } from "@/lib/types";
import ProductBottle from "./product-bottle";

/* model-viewer is ~large, so it's only fetched when the customer taps 3D. */
const ModelViewer3D = dynamic(() => import("./model-viewer-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold-400/30 border-t-gold-300" />
    </div>
  ),
});

export default function ProductVisual({ product }: { product: Product }) {
  const [mode, setMode] = useState<"art" | "3d">("art");

  return (
    <div className="relative">
      <div
        className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/[0.06] sm:h-[520px]"
        style={{
          background: `radial-gradient(120% 100% at 50% 0%, ${product.palette[0]}30 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.25))`,
        }}
      >
        {/* ambient glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40 blur-3xl"
          style={{
            background: `radial-gradient(60% 60% at 50% 55%, ${product.palette[1]}55, transparent 70%)`,
          }}
        />

        {mode === "art" ? (
          product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="relative h-full w-full object-cover transition-transform duration-700"
            />
          ) : (
            <div className="animate-floaty relative drop-shadow-2xl">
              <ProductBottle product={product} className="h-80 w-auto sm:h-[400px]" />
            </div>
          )
        ) : (
          <div className="absolute inset-0">
            <ModelViewer3D
              src="/models/perfume-bottle.glb"
              poster="/models/perfume-bottle-poster.jpg"
            />
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-ink-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Drag to rotate · tap to zoom
            </span>
          </div>
        )}

        {product.tag && (
          <span className="absolute left-4 top-4 rounded-full border border-gold-400/40 bg-gold-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-200">
            {product.tag}
          </span>
        )}

        {/* 2D / 3D switch */}
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/80 p-1">
          {(["art", "3d"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-all ${
                mode === m
                  ? "bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950"
                  : "text-zinc-300 hover:text-gold-200"
              }`}
            >
              {m === "art" ? "2D" : "3D"}
            </button>
          ))}
        </div>
      </div>

      {mode === "3d" && (
        <p className="mt-2 text-center text-[10px] text-zinc-500">
          3D model by Poly by Google ·{" "}
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-zinc-600 underline-offset-2 hover:text-gold-300"
          >
            CC BY 3.0
          </a>
        </p>
      )}
    </div>
  );
}
