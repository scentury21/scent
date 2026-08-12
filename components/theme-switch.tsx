"use client";

import { applyTheme, useTheme } from "./theme-toggle";

/** Segmented Light / Dark control used inside the mobile menu Settings. */
export default function ThemeSwitch() {
  const dark = useTheme();

  const pick = (d: boolean) => applyTheme(d);

  const active =
    "bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950 shadow-[0_4px_14px_-4px_rgba(212,169,74,0.6)]";
  const idle = "text-zinc-300 hover:text-gold-200";

  return (
    <div
      className="flex w-full rounded-full border border-white/10 bg-white/[0.04] p-1"
      role="radiogroup"
      aria-label="Theme"
    >
      <button
        role="radio"
        aria-checked={dark}
        onClick={() => pick(true)}
        className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all duration-300 ${dark ? active : idle}`}
      >
        <span aria-hidden>🌙</span> Dark
      </button>
      <button
        role="radio"
        aria-checked={!dark}
        onClick={() => pick(false)}
        className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all duration-300 ${!dark ? active : idle}`}
      >
        <span aria-hidden>☀️</span> Light
      </button>
    </div>
  );
}
