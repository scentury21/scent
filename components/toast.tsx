"use client";

import { useEffect, useState } from "react";

export type ToastKind = "success" | "info" | "error";

type Toast = { id: number; message: string; kind: ToastKind };

const TOAST_EVENT = "scentury:toast";
const TOAST_MS = 3200;

/** Fire a toast from anywhere (client-side):  showToast("Added to cart"). */
export function showToast(message: string, kind: ToastKind = "success") {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { message, kind } })
  );
}

/** Mount once in the root layout. Solid glass-flat surfaces (no
 *  backdrop-filter — Android Chrome renders typed text inside blurred
 *  containers invisible, and it also stutters on animations). */
export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 1;

    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string; kind?: ToastKind }>)
        .detail;
      if (!detail?.message) return;
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, message: detail.message!, kind: detail.kind ?? "success" }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_MS);
    };

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  const styles: Record<ToastKind, string> = {
    success:
      "border-emerald-400/30 bg-ink-900/95 text-emerald-100",
    info: "border-gold-400/30 bg-ink-900/95 text-gold-100",
    error: "border-red-400/30 bg-ink-900/95 text-red-100",
  };

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)] ${styles[t.kind]}`}
        >
          <span className="shrink-0 text-base">
            {t.kind === "success" ? "✅" : t.kind === "error" ? "⚠️" : "✨"}
          </span>
          <span className="min-w-0 flex-1 truncate">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss"
            className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
