"use client";

import Link from "next/link";

/** Shown when a page needs an account. Keeps redirectTo so the user lands
 *  right back after signing in / creating an account. */
export default function AuthGate({ redirectTo = "/shop" }: { redirectTo?: string }) {
  const target = encodeURIComponent(redirectTo);
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
      <div className="glass rounded-2xl p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-600 font-display text-xl font-bold text-ink-950 shadow-[0_6px_20px_-6px_rgba(212,169,74,0.7)]">
          S
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-zinc-50">
          Create an account to check out
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Explore freely — but to complete your order you&apos;ll need an account. It takes seconds
          and lets you track your delivery.
        </p>
        <div className="mt-7 space-y-3">
          <Link href={`/signup?redirectTo=${target}`} className="btn btn-gold block w-full py-3.5">
            Create account
          </Link>
          <Link href={`/login?redirectTo=${target}`} className="btn btn-ghost block w-full py-3.5">
            Sign in
          </Link>
        </div>
        <Link
          href="/shop"
          className="mt-6 inline-block text-sm font-semibold text-gold-300 hover:text-gold-200"
        >
          ← Keep exploring the shop
        </Link>
      </div>
    </div>
  );
}
