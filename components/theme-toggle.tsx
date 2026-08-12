"use client";

import { useSyncExternalStore } from "react";

const THEME_KEY = "scentury-theme";
const COLORS = { dark: "#08070f", light: "#faf6ef" };

const listeners = new Set<() => void>();

/** Shared theme primitives so the icon toggle and the Settings segmented
 *  control stay in sync. Client-side only. */
export function isDarkTheme(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  );
}

function subscribeTheme(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function serverSnapshot() {
  return true; // SSR defaults to dark; hydrated value corrects on mount
}

/** Reactive dark-mode flag — re-renders every component that uses it
 *  whenever the theme changes (from anywhere). */
export function useTheme(): boolean {
  return useSyncExternalStore(subscribeTheme, isDarkTheme, serverSnapshot);
}

export function applyTheme(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  } catch {
    /* private mode — preference just won't persist */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next ? COLORS.dark : COLORS.light);
  listeners.forEach((l) => l());
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const dark = useTheme();

  return (
    <button
      onClick={() => applyTheme(!dark)}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`group relative flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:border-gold-400/50 hover:text-gold-200 ${
        compact ? "h-9 w-9" : "h-10 w-10"
      }`}
    >
      {/* Sun */}
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`absolute transition-all duration-500 ${
          dark ? "translate-y-0 rotate-0 opacity-100" : "translate-y-7 -rotate-90 opacity-0"
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      {/* Moon */}
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute transition-all duration-500 ${
          dark ? "-translate-y-7 rotate-90 opacity-0" : "translate-y-0 rotate-0 opacity-100"
        }`}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
